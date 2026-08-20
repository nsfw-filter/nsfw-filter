import { PredictionRequest, PredictionResponse } from '../../utils/messages'

type IFilter = {
  getBlockAmount: () => number
}

type FilterRequestWaiter = {
  resolve: (value: PredictionResponse) => void
  reject: (error: PredictionRequest) => void
}

type FilterRequestQueueValue = {
  waiters: FilterRequestWaiter[]
  deadline: number
  request: PredictionRequest
}

// Nothing downstream is guaranteed to answer. The service worker can be torn
// down mid-request, and an offscreen document whose TensorFlow.js backend wedged
// never replies at all. The image stays hidden until this promise settles, so
// without a deadline here one stuck classification leaves it hidden for the life
// of the page. Reveal it instead: showing an unclassified image is a bad
// outcome, but a permanently blank page is a worse one, and it matches how the
// rest of the filter degrades when it can't get a verdict.
const ANALYSIS_DEADLINE = 60000

export class Filter implements IFilter {
  protected blockedItems: number
  private readonly requestQueue: Map<string, FilterRequestQueueValue>

  constructor () {
    this.blockedItems = 0
    this.requestQueue = new Map()
  }

  public getBlockAmount (): number {
    return this.blockedItems
  }

  protected async requestToAnalyzeImage (request: PredictionRequest): Promise<PredictionResponse> {
    return await new Promise((resolve, reject) => {
      const queueName = request.url

      try {
        const queued = this.requestQueue.get(queueName)
        if (queued !== undefined) {
          queued.waiters.push({ resolve, reject })
        } else {
          this.requestQueue.set(queueName, {
            waiters: [{ resolve, reject }],
            deadline: window.setTimeout(() => this._giveUp(queueName), ANALYSIS_DEADLINE),
            request
          })

          this._requestToAnalyzeImage(request)
        }
      } catch {
        const pending = this._take(queueName)
        if (pending !== undefined) {
          for (const { reject } of pending.waiters) reject(request)
        } else {
          reject(request)
        }
      }
    })
  }

  // Take the pending entry for `url` off the queue and stop its timers. Returns
  // undefined when it was already settled, which is how a reply that arrives
  // after we gave up gets dropped instead of resolving twice.
  private _take (url: string): FilterRequestQueueValue | undefined {
    const queued = this.requestQueue.get(url)
    if (queued === undefined) return undefined

    window.clearTimeout(queued.deadline)
    window.clearTimeout(queued.request.reconectTimer)
    this.requestQueue.delete(url)

    return queued
  }

  // Same, for a reply belonging to a specific request. The same url can be queued
  // again after one times out, so a late reply must not settle the new entry.
  private _takeFor (request: PredictionRequest): FilterRequestQueueValue | undefined {
    if (this.requestQueue.get(request.url)?.request !== request) return undefined

    return this._take(request.url)
  }

  private _giveUp (url: string): void {
    const pending = this._take(url)
    if (pending === undefined) return

    console.warn(`[NSFW-Filter] No verdict for ${url} after ${ANALYSIS_DEADLINE}ms, marked as visible`)
    for (const { resolve } of pending.waiters) {
      resolve(new PredictionResponse(false, url, 'Analysis timed out'))
    }
  }

  private _requestToAnalyzeImage (request: PredictionRequest): void {
    chrome.runtime.sendMessage(request, (response: PredictionResponse) => {
      if (chrome.runtime.lastError !== null && chrome.runtime.lastError !== undefined) {
        this._handleBackgroundErrors(request, chrome.runtime.lastError.message)
        return
      }

      const pending = this._takeFor(request)
      if (pending === undefined) return

      for (const { resolve } of pending.waiters) resolve(response)
    })
  }

  private _handleBackgroundErrors (request: PredictionRequest, message: string | undefined): void {
    const reconnectCount = request.clearTimer()
    console.log(`[NSFW-Filter] Cannot connect to background worker for ${request.url} image, attempt ${reconnectCount}, error: ${message}`)

    if (reconnectCount > 5) {
      const pending = this._takeFor(request)
      if (pending === undefined) return

      console.warn(`[NSFW-Filter] Background worker is down, marked as visible ${request.url}`)
      for (const { resolve } of pending.waiters) {
        resolve(new PredictionResponse(false, request.url, 'Background worker doesn\'t working'))
      }
    } else {
      request.reconectTimer = window.setTimeout(() => this._requestToAnalyzeImage(request), 500)
    }
  }
}
