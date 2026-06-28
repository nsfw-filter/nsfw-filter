import {
  OffscreenClassifyResponse,
  OffscreenRequest
} from '../utils/messages'

// Service-worker-side proxy for the model that runs in the offscreen document.
// It plays the same role the `Model` class did for the queues (`predict` and
// `setSettings`), but every call is an RPC because a Manifest V3 service worker
// can't touch the DOM or run the WebGL/WASM model itself.
export type IOffscreenModel = {
  predict: (url: string) => Promise<boolean>
  setSettings: (filterStrictness: number, logging: boolean) => void
}

export class OffscreenModel implements IOffscreenModel {
  public async predict (url: string): Promise<boolean> {
    const request: OffscreenRequest = { target: 'offscreen', type: 'CLASSIFY', url }

    return await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(request, (response: OffscreenClassifyResponse | undefined) => {
        if (chrome.runtime.lastError !== null && chrome.runtime.lastError !== undefined) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (response === undefined) {
          reject(new Error('No response from offscreen document'))
          return
        }

        if (typeof response.error === 'string' && response.error.length > 0) {
          reject(new Error(response.error))
          return
        }

        resolve(response.result)
      })
    })
  }

  public setSettings (filterStrictness: number, logging: boolean): void {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_SETTINGS',
      filterStrictness,
      logging
    }

    chrome.runtime.sendMessage(request, () => {
      // Reading lastError marks the "receiving end does not exist" race as
      // handled so Chrome stays quiet. Settings are re-sent whenever the popup
      // closes, so a missed update is self-healing.
      if (chrome.runtime.lastError !== undefined) { /* handled */ }
    })
  }
}
