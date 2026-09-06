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
// through. Send those again until the new realm answers. The budget covers a
// reload plus a model load and still leaves room under the content script's 60s
// deadline. Bounded by wall clock rather than by a count, so a realm that answers
// slowly can't stretch it.
const REALM_RETRY_DELAY = 1000
const REALM_RETRY_BUDGET = 30000

export class OffscreenModel implements IOffscreenModel {
  public async predict (url: string, label?: string): Promise<boolean> {
    const request: OffscreenRequest = { target: 'offscreen', type: 'CLASSIFY', url, label }

    const deadline = Date.now() + REALM_RETRY_BUDGET

    for (;;) {
      try {
        return await this.classify(request)
      } catch (error) {
        if (!(error instanceof RealmGoneError) || Date.now() >= deadline) throw error
        await new Promise(resolve => setTimeout(resolve, REALM_RETRY_DELAY))
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
