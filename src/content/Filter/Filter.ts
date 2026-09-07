import { PredictionRequest, PredictionResponse } from '../../utils/messages'

type IFilter = {
  getBlockAmount: () => number
}

export type FilterEffect = 'blur' | 'hide' | 'grayscale'
export type FilterElement = HTMLElement | SVGElement

export type FilterSettings = {
  filterEffect: FilterEffect
}

const BLUR = 'blur(25px)'
const GRAYSCALE = 'grayscale(1)'

// Icons, sprites and spacers: too small to be worth a round trip. Images,
// backgrounds and canvases all draw the line in the same place.
export const MIN_MEDIA_SIZE = 41

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
// offscreen document whose TensorFlow.js backend wedged never replies. Settle
// with an error so callers can distinguish unavailable media from safe media.
const ANALYSIS_DEADLINE = 60000

export class Filter implements IFilter {
  protected blockedItems: number
  protected settings: FilterSettings
  private readonly requestQueue: Map<string, FilterRequestQueueValue>
  private readonly hiddenByUs: WeakSet<FilterElement>

  constructor () {
    this.blockedItems = 0
    this.settings = { filterEffect: 'hide' }
    this.requestQueue = new Map()
    this.hiddenByUs = new WeakSet()
  }

  public getBlockAmount (): number {
    return this.blockedItems
  }

  public setSettings (settings: FilterSettings): void {
    this.settings = settings
  }

  protected statusOf (element: FilterElement): string | undefined {
    return element.dataset.nsfwFilterStatus
  }

  public checkStyleMutation (element: FilterElement): void {
    const status = this.statusOf(element)
    if (status === 'processing') {
      if (!this.isHidden(element)) this.hideElement(element)
      return
    }
    if (!this.isBlocked(element)) return
    if (!this.isEffectApplied(element)) this.applyEffect(element)
  }

  // `hidden` as well as the inline style: an image whose parent is BODY is
  // rendered by Chrome's document-level image viewer, which ignores visibility.
  // Track what we hid that way: the page can move the element out of BODY before
  // the verdict lands, and clearing `hidden` only for what is still a BODY child
  // would leave it hidden for good.
  protected hideElement (element: FilterElement): void {
    if (element instanceof HTMLImageElement && element.parentNode?.nodeName === 'BODY') {
      element.hidden = true
      this.hiddenByUs.add(element)
    }
    element.style.setProperty('visibility', 'hidden', 'important')
  }

  // Remove what we wrote rather than forcing `visible`: the page may have hidden
  // this element for its own reasons, and a filter that is off should leave no
  // declaration of ours behind.
  protected revealElement (element: FilterElement): void {
    this.unsetHidden(element)
    element.style.removeProperty('filter')
    element.style.removeProperty('visibility')
  }

  protected applyEffect (element: FilterElement): void {
    if (this.settings.filterEffect === 'hide') {
      this.hideElement(element)
      return
    }

    const effect = this.settings.filterEffect === 'blur' ? BLUR : GRAYSCALE
    element.style.setProperty('filter', effect, 'important')
    // Blur and grayscale show the element; lift a hide from an earlier verdict
    // without overriding the page's own visibility.
    element.style.removeProperty('visibility')
    this.unsetHidden(element)
  }

  private unsetHidden (element: FilterElement): void {
    if (this.hiddenByUs.delete(element) && element instanceof HTMLElement) element.hidden = false
  }

  // Match our exact value, not a substring: a site setting its own weak
  // `filter: blur(1px)` on a blocked element must still count as effect-gone so
  // we re-apply the full blur, not leave it barely obscured.
  protected isEffectApplied (element: FilterElement): boolean {
    if (this.settings.filterEffect === 'hide') return this.isHidden(element)
    return this.hasImportant(element, 'filter', this.settings.filterEffect === 'blur' ? BLUR : GRAYSCALE)
  }

  protected isHidden (element: FilterElement): boolean {
    return this.hasImportant(element, 'visibility', 'hidden')
  }

  // Blocked either way: one is a verdict, the other is our answer to media we
  // could not read. Both wear the configured effect and neither is re-judged.
  protected isBlocked (element: FilterElement): boolean {
    const status = this.statusOf(element)
    return status === 'nsfw' || status === 'unavailable'
  }

  // Zero means the element has no box yet, not that it is small: it is still a
  // candidate, and clearing it here would show whatever it holds the moment the
  // page gives it a size.
  protected belowMinSize (width: number, height: number): boolean {
    return width !== 0 && height !== 0 && (width <= MIN_MEDIA_SIZE || height <= MIN_MEDIA_SIZE)
  }

  private hasImportant (element: FilterElement, property: string, value: string): boolean {
    return element.style.getPropertyValue(property) === value &&
      element.style.getPropertyPriority(property) === 'important'
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

    console.warn(`[NSFW-Filter] No verdict for ${url} after ${ANALYSIS_DEADLINE}ms, analysis unavailable`)
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

      console.warn(`[NSFW-Filter] Background worker is down, analysis unavailable ${request.url}`)
      for (const { resolve } of pending.waiters) {
        resolve(new PredictionResponse(false, request.url, 'Background worker doesn\'t working'))
      }
    } else {
      request.reconectTimer = window.setTimeout(() => this._requestToAnalyzeImage(request), 500)
    }
  }
}
