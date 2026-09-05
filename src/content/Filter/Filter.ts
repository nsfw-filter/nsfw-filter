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

// An image stays hidden until its prediction settles, and nothing downstream is
// guaranteed to answer: the service worker can be torn down mid-request, and an
// offscreen document whose TensorFlow.js backend wedged never replies. Reveal the
// image rather than leave it hidden for the life of the page.
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

  // Takes the pending entry off the queue and stops its timers. undefined means it
  // was already settled, which is how a reply that arrives too late is dropped.
  private _take (url: string): FilterRequestQueueValue | undefined {
    const queued = this.requestQueue.get(url)
    if (queued === undefined) return undefined

    window.clearTimeout(queued.deadline)
    window.clearTimeout(queued.request.reconectTimer)
    this.requestQueue.delete(url)

    return queued
  }

  // A url can be queued again after a request is abandoned, so a reply or a retry
  // has to prove it still belongs to the entry on the queue.
  private _isCurrent (request: PredictionRequest): boolean {
    return this.requestQueue.get(request.url)?.request === request
  }

  private _takeFor (request: PredictionRequest): FilterRequestQueueValue | undefined {
    if (!this._isCurrent(request)) return undefined

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
    // A sendMessage callback can't be cancelled, so this still fires for a request
    // we gave up on. Nothing is waiting on it; don't restart the retry loop.
    if (!this._isCurrent(request)) return

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
