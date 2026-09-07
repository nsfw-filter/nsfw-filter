import {
  OffscreenClassifyResponse,
  OffscreenRequest,
  RESTARTING_MESSAGE
} from '../utils/messages'
import { TrainedModel } from '../utils/models'

// Service-worker-side proxy for the model that runs in the offscreen document.
// It plays the same role the `Model` class did for the queues (`predict` and
// `setSettings`), but every call is an RPC because a Manifest V3 service worker
// can't touch the DOM or run the WebGL/WASM model itself.
export type IOffscreenModel = {
  predict: (url: string, label?: string) => Promise<boolean>
  setSettings: (filterStrictness: number, logging: boolean, trainedModel: TrainedModel) => void
}

// A classification that dies with the offscreen realm, as opposed to one the model
// answered. Only these are worth sending again.
class RealmGoneError extends Error {}

// Coming up on WASM means reloading the offscreen document, which kills every
// classification in flight. The service worker sees a closed port, which is
// indistinguishable from a real failure, and a failure reaches the page as "safe",
// so the first page open on a machine without a usable GPU had every image waved
// through. Send those again until the new realm answers. The budget is how long
// resends stay admissible, not a deadline on the answer: a reload plus a model
// load has to fit inside it. The clock starts when the loss is first seen, not when
// the classification was sent, because a slow bring-up can burn a request-relative
// budget before the restart it is meant to cover has even happened.
const REALM_RETRY_DELAY = 1000
const REALM_RETRY_WINDOW = 30000

export class OffscreenModel implements IOffscreenModel {
  public async predict (url: string, label?: string): Promise<boolean> {
    const request: OffscreenRequest = { target: 'offscreen', type: 'CLASSIFY', url, label }

    let deadline = 0

    for (;;) {
      try {
        return await this.classify(request)
      } catch (error) {
        if (!(error instanceof RealmGoneError)) throw error
        if (deadline === 0) deadline = Date.now() + REALM_RETRY_WINDOW

        await new Promise(resolve => setTimeout(resolve, REALM_RETRY_DELAY))
        // Checked after the wait as well: the window can close while sleeping.
        if (Date.now() >= deadline) throw error
      }
    }
  }

  private async classify (request: OffscreenRequest): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(request, (response: OffscreenClassifyResponse | undefined) => {
        if (chrome.runtime.lastError !== undefined) {
          reject(new RealmGoneError(chrome.runtime.lastError.message))
          return
        }

        if (response === undefined) {
          reject(new RealmGoneError('No response from offscreen document'))
          return
        }

        if (typeof response.error === 'string' && response.error.length > 0) {
          // The document answers this one before it navigates away, so it is the
          // same loss as a closed port, just reported a moment earlier.
          reject(response.error === RESTARTING_MESSAGE
            ? new RealmGoneError(response.error)
            : new Error(response.error))
          return
        }

        resolve(response.result)
      })
    })
  }

  public setSettings (filterStrictness: number, logging: boolean, trainedModel: TrainedModel): void {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_SETTINGS',
      filterStrictness,
      logging,
      trainedModel
    }

    chrome.runtime.sendMessage(request, () => {
      // Reading lastError marks the "receiving end does not exist" race as
      // handled so Chrome stays quiet. Settings are re-sent whenever the popup
      // closes, so a missed update is self-healing.
      if (chrome.runtime.lastError !== undefined) { /* handled */ }
    })
  }
}
