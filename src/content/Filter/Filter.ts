import { PredictionRequest, PredictionResponse } from '../../utils/messages'

type IFilter = {
  getBlockAmount: () => number
}

export type FilterEffect = 'blur' | 'hide' | 'grayscale'
export type FilterElement = HTMLElement | SVGElement

export type FilterSettings = {
  filterEffect: FilterEffect
}

type StyleProperty = 'visibility' | 'filter'
type SavedStyle = { value: string, priority: string, override: string }

const BLUR = 'blur(25px)'
const GRAYSCALE = 'grayscale(1)'

// Ignore small media such as icons, sprites and spacers.
export const MIN_MEDIA_SIZE = 41

// How far outside the viewport media is still worth judging, so it is ready by
// the time a scroll brings it in.
export const OFFSCREEN_MARGIN = '300px'

type FilterRequestWaiter = {
  resolve: (value: PredictionResponse) => void
  reject: (error: PredictionRequest) => void
}

type FilterRequestQueueValue = {
  waiters: FilterRequestWaiter[]
  deadline: number
  request: PredictionRequest
}

// Bound requests that never answer, without mistaking a timeout for a safe verdict.
const ANALYSIS_DEADLINE = 60000

export class Filter implements IFilter {
  protected blockedItems: number
  protected settings: FilterSettings
  private readonly requestQueue: Map<string, FilterRequestQueueValue>
  private readonly savedStyles = new WeakMap<FilterElement, Partial<Record<StyleProperty, SavedStyle>>>()
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

  public checkStyleMutation (element: FilterElement): void {
    const status = element.dataset.nsfwFilterStatus
    if (status === 'processing' || status === 'unavailable') {
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
    this.overrideStyle(element, 'visibility', 'hidden')
  }

  protected revealElement (element: FilterElement): void {
    this.unsetHidden(element)
    this.restoreStyle(element, 'filter')
    this.restoreStyle(element, 'visibility')
  }

  protected applyEffect (element: FilterElement): void {
    if (this.settings.filterEffect === 'hide') {
      this.hideElement(element)
      return
    }

    const effect = this.settings.filterEffect === 'blur' ? BLUR : GRAYSCALE
    this.overrideStyle(element, 'filter', effect)
    // Lift our pending hide without changing the page’s visibility.
    this.restoreStyle(element, 'visibility')
    this.unsetHidden(element)
  }

  private overrideStyle (element: FilterElement, property: StyleProperty, value: string): void {
    const saved = this.savedStyles.get(element) ?? {}
    const previous = saved[property]
    // A page write since our last override becomes the value to restore.
    if (previous === undefined || !this.hasImportant(element, property, previous.override)) {
      saved[property] = {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
        override: value
      }
    } else {
      previous.override = value
    }
    this.savedStyles.set(element, saved)
    element.style.setProperty(property, value, 'important')
  }

  private restoreStyle (element: FilterElement, property: StyleProperty): void {
    const saved = this.savedStyles.get(element)
    if (saved === undefined) return
    const previous = saved[property]
    if (previous === undefined) return

    // Leave newer page-authored styles alone.
    if (this.hasImportant(element, property, previous.override)) {
      if (previous.value === '') element.style.removeProperty(property)
      else element.style.setProperty(property, previous.value, previous.priority)
    }
    delete saved[property]
    if (saved.visibility === undefined && saved.filter === undefined) this.savedStyles.delete(element)
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

  protected isBlocked (element: FilterElement): boolean {
    return element.dataset.nsfwFilterStatus === 'nsfw'
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
    for (const { reject } of pending.waiters) reject(pending.request)
  }

  private _requestToAnalyzeImage (request: PredictionRequest): void {
    chrome.runtime.sendMessage(request, (response: PredictionResponse) => {
      if (chrome.runtime.lastError !== null && chrome.runtime.lastError !== undefined) {
        this._handleBackgroundErrors(request, chrome.runtime.lastError.message)
        return
      }

      const pending = this._takeFor(request)
      if (pending === undefined) return

      for (const { resolve, reject } of pending.waiters) {
        if (response === undefined || response.error !== undefined) reject(request)
        else resolve(response)
      }
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
      for (const { reject } of pending.waiters) reject(request)
    } else {
      request.reconectTimer = window.setTimeout(() => this._requestToAnalyzeImage(request), 500)
    }
  }
}
