import { PredictionRequest } from '../../utils/messages'
import { mediaElements } from '../mediaRoots'

import { backgroundImageUrls } from './backgroundImageValue'
import { Filter, MIN_MEDIA_SIZE } from './Filter'

export type IBackgroundImageFilter = {
  observe: (root: Element) => void
  release: (root: Element) => void
  checkElement: (element: HTMLElement) => void
  checkStyleMutation: (element: HTMLElement) => void
  recheckVisible: () => void
  applyEffectToBlocked: () => void
  revealAll: () => void
  start: () => void
  stop: () => void
}

type BackgroundState = {
  // Bumped whenever the element's background stack changes. A verdict carrying an
  // older generation is for a background this element no longer shows, which is
  // what a recycled list row looks like from here.
  generation: number
  key: string
  // A request is out for this key. Without it, a verdict dropped while filtering
  // was paused would leave the element on `processing` with nothing to settle it.
  pending: boolean
  // The inline declaration as the page left it, so the cascade comes back exactly
  // as it was rather than as a serialized computed value.
  inline: {
    value: string
    priority: string
    shorthand: { value: string, priority: string } | null
    // Whether the page had a style attribute at all: `.card[style]` rules make an
    // empty one we left behind a background of its own.
    attribute: boolean
  } | null
}

const OFFSCREEN_MARGIN = '300px'
// Past this many dirty roots, testing every visible element against each of them
// costs more than simply re-reading the visible set.
const DIRTY_ROOT_LIMIT = 8
// A drag fires resize continuously; one recheck per quarter second is enough to
// catch a breakpoint being crossed.
const RESIZE_INTERVAL = 250
// Elements that never paint a background, so walking into them is wasted work.
// Every style write we make reaches the observer as its own mutation record, and
// checkStyleMutation counts them off one by one. The writes go through this so a
// caller cannot perform one without it being counted.
type StyleWriter = {
  set: (property: string, value: string, priority: string) => void
  remove: (property: string) => void
  dropAttribute: () => void
}

const SKIPPED = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'TEMPLATE', 'NOSCRIPT', 'BR'])

export class BackgroundImageFilter extends Filter implements IBackgroundImageFilter {
  private readonly states: WeakMap<HTMLElement, BackgroundState>
  private readonly visible: Set<HTMLElement>
  private readonly writes: WeakMap<HTMLElement, number>
  private readonly dirty: Set<HTMLElement>
  private readonly viewport: IntersectionObserver
  private allDirty: boolean
  private scheduled: boolean
  private resizeTimer: ReturnType<typeof setTimeout> | undefined
  private active: boolean

  private readonly pseudoFilters: BackgroundImageFilter[]
  private readonly statusKey: string
  private readonly statusAttribute: string
  private readonly hiddenAttribute: string

  constructor (private readonly pseudo: 'before' | 'after' | null = null) {
    super()
    this.pseudoFilters = pseudo === null
      ? [new BackgroundImageFilter('before'), new BackgroundImageFilter('after')]
      : []
    this.statusKey = pseudo === null
      ? 'nsfwFilterBackgroundStatus'
      : `nsfwFilter${pseudo === 'before' ? 'Before' : 'After'}Status`
    this.statusAttribute = `data-nsfw-filter-${pseudo ?? 'background'}-status`
    this.hiddenAttribute = `data-nsfw-filter-${pseudo}-hidden`
    this.states = new WeakMap()
    this.visible = new Set()
    this.writes = new WeakMap()
    this.dirty = new Set()
    this.allDirty = false
    this.scheduled = false
    this.resizeTimer = undefined
    this.active = true
    this.viewport = new IntersectionObserver(
      this.onIntersection.bind(this),
      { rootMargin: OFFSCREEN_MARGIN }
    )
    // A media query can swap a background under an element that never moves and
    // never changes an attribute, so a resize is the only sign it happened.
    window.addEventListener('resize', () => {
      if (this.resizeTimer !== undefined) return
      this.resizeTimer = setTimeout(() => {
        this.resizeTimer = undefined
        this.recheckVisible()
      }, RESIZE_INTERVAL)
    })
  }

  // Whether an element has a background is only knowable from computed style, and
  // asking every element on load costs a full style resolution. Registration is
  // cheap; the question is asked when the element comes near the viewport.
  public observe (root: Element): void {
    this.eachPseudo(filter => filter.observe(root))
    if (!this.active) return

    this.walk(root, element => {
      this.viewport.observe(element)
      // Observing an element again produces no notification, so an element we have
      // already judged and that moved here needs an explicit re-read: its new
      // parent can select a different background.
      if (this.states.has(element)) this.markDirty(element)
    })
  }

  // A removed subtree keeps its override and its pending request otherwise, which
  // leaves the background missing for good if the element comes back.
  public release (root: Element): void {
    this.eachPseudo(filter => filter.release(root))
    this.walk(root, element => {
      if (element.isConnected) {
        // Moved rather than removed: keep it hidden and force a fresh verdict. Its
        // registration still stands, and an element that stays on screen through
        // the move gets no new notification, so it keeps its place in `visible`.
        const state = this.states.get(element)
        if (state !== undefined) state.key = ''
        this.markDirty(element)
        return
      }

      this.visible.delete(element)
      this.dirty.delete(element)
      this.viewport.unobserve(element)
      if (!this.states.has(element)) return
      this.restore(element)
      this.states.delete(element)
      delete element.dataset[this.statusKey]
    })
  }

  // A class change can swap the background of the element itself or of anything
  // under it, and a rule that now matches produces no new intersection.
  public checkElement (element: HTMLElement): void {
    this.eachPseudo(filter => filter.checkElement(element))
    this.markDirty(element)
  }

  // Some sites rewrite inline styles on every render, which takes our override
  // with them. Each of our own writes accounts for exactly one mutation, so they
  // are counted off one by one: an intact override proves nothing, and a page that
  // writes in reaction to ours must not be swallowed along with it.
  public checkStyleMutation (element: HTMLElement): void {
    this.eachPseudo(filter => filter.checkStyleMutation(element))
    const ours = this.writes.get(element) ?? 0
    if (ours > 0) {
      this.writes.set(element, ours - 1)
      return
    }

    this.markDirty(element)
  }

  // A stylesheet arriving late changes no attribute and triggers no intersection,
  // so nothing else would ask about the backgrounds it brings.
  public recheckVisible (): void {
    this.eachPseudo(filter => filter.recheckVisible())
    if (!this.active) return
    this.allDirty = true
    this.schedule()
  }

  // A live effect change doesn't alter a verdict. Backgrounds are removed rather
  // than blurred whatever the effect is, so there is nothing to re-render; the
  // hook exists so content.ts can treat both filters the same.
  public applyEffectToBlocked (): void {}

  public revealAll (): void {
    this.eachPseudo(filter => filter.revealAll())
    this.filtered().forEach(element => {
      this.restore(element)
      this.states.delete(element)
      delete element.dataset[this.statusKey]
    })
  }

  // Resuming produces no new intersection for targets already registered, so what
  // is on screen has to be re-read here or it stays revealed.
  public start (): void {
    this.eachPseudo(filter => filter.start())
    this.active = true
    this.recheckVisible()
  }

  // Live pause or allow-list. Restoring what we removed is revealAll's job.
  public stop (): void {
    this.eachPseudo(filter => filter.stop())
    this.active = false
    this.dirty.clear()
    this.allDirty = false
  }

  private walk (root: Element, visit: (element: HTMLElement) => void): void {
    if (root instanceof HTMLElement && !SKIPPED.has(root.nodeName)) visit(root)
    if (SKIPPED.has(root.nodeName)) return

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: node => SKIPPED.has(node.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    })

    while (walker.nextNode() !== null) {
      const element = walker.currentNode
      if (element instanceof HTMLElement) visit(element)
    }
  }

  private markDirty (element: HTMLElement): void {
    if (!this.active) return
    this.dirty.add(element)
    this.schedule()
  }

  // Mutations arrive in bursts, and one ancestor change can dirty every card under
  // it. Reading style per mutation would interleave reads and writes across the
  // whole burst; one pass afterwards reads each element once.
  private schedule (): void {
    if (this.scheduled) return
    this.scheduled = true
    queueMicrotask(() => {
      this.scheduled = false
      this.flush()
    })
  }

  private flush (): void {
    const roots = [...this.dirty]
    const all = this.allDirty
    this.dirty.clear()
    this.allDirty = false
    if (!this.active) return

    if (all || roots.length > DIRTY_ROOT_LIMIT) {
      for (const candidate of [...this.visible]) this.analyze(candidate)
      return
    }

    const done = new Set<HTMLElement>()
    for (const root of roots) {
      if (!this.visible.has(root) && root.dataset[this.statusKey] === undefined) continue
      done.add(root)
      this.analyze(root)
    }

    for (const candidate of [...this.visible]) {
      if (done.has(candidate)) continue
      // Sibling combinators put the affected element beside the changed one, not
      // under it, so the parent is the smallest subtree that holds both.
      if (roots.some(root => (root.parentElement ?? root).contains(candidate))) this.analyze(candidate)
    }
  }

  private onIntersection (entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const element = entry.target as HTMLElement
      if (!entry.isIntersecting) {
        this.visible.delete(element)
        if (!element.isConnected) this.release(element)
        continue
      }

      this.visible.add(element)
      this.analyze(element)
    }
  }

  private analyze (element: HTMLElement): void {
    if (!this.active || !element.isConnected) return
    // Icons, sprites and spacers: too small to be worth a round trip. The root
    // and the body are exempt: their background paints the whole canvas whatever
    // box they happen to have.
    const { width, height } = element.getBoundingClientRect()
    const canvas = element === document.body || element === document.documentElement
    if (this.pseudo === null && !canvas && (width <= MIN_MEDIA_SIZE || height <= MIN_MEDIA_SIZE)) {
      if (width > 0 && height > 0 && element.dataset[this.statusKey] === undefined) {
        element.dataset[this.statusKey] = 'sfw'
      }
      return
    }

    const state = this.states.get(element)
    // Our own override masks the author's value, so the page's current background
    // has to be read with it lifted. Both writes land in this task, before paint.
    if (state !== undefined) this.restore(element)

    // Lift the pending stylesheet only while reading the author's background.
    // A real image is hidden again below in the same task, before paint.
    if (element.dataset[this.statusKey] === undefined) {
      element.dataset[this.statusKey] = 'processing'
    }

    const computed = this.pseudo === null
      ? getComputedStyle(element)
      : getComputedStyle(element, `::${this.pseudo}`)
    const urls = backgroundImageUrls(computed.backgroundImage)
    const key = urls.join(' ')
    if (urls.length === 0) {
      this.states.delete(element)
      if (element.dataset[this.statusKey] !== 'sfw') element.dataset[this.statusKey] = 'sfw'
      return
    }

    const status = element.dataset[this.statusKey]
    if (this.alreadyJudging(state, key, status)) {
      // Put the effect back if it was a block, since restore() lifted it.
      if (status !== 'sfw') this.hide(element, state as BackgroundState)
      return
    }

    const generation = (state?.generation ?? 0) + 1
    const next: BackgroundState = { generation, key, pending: true, inline: null }
    this.states.set(element, next)
    element.dataset[this.statusKey] = 'processing'
    this.hide(element, next)

    void this.classify(element, next, urls)
  }

  // One unsafe layer condemns the stack: the layers are positioned against each
  // other, and dropping only one leaves the rest misaligned over a gap.
  // The verdict we hold, or the one still in flight, is for exactly this stack of
  // urls: there is nothing new to ask.
  // Backgrounds keep their verdict under their own attribute, one per pseudo, so
  // the inherited status checks have to look there rather than at the element's
  // media status.
  protected statusOf (element: HTMLElement): string | undefined {
    return element.dataset[this.statusKey]
  }

  // The ::before and ::after instances are driven from here so every entry point
  // reaches all three. A public method that forgets this line filters the
  // element's own background and silently leaves its pseudo-elements alone.
  private eachPseudo (apply: (filter: BackgroundImageFilter) => void): void {
    for (const filter of this.pseudoFilters) apply(filter)
  }

  private alreadyJudging (
    state: BackgroundState | undefined, key: string, status: string | undefined
  ): boolean {
    if (state?.key !== key || status === undefined) return false
    return status !== 'processing' || state.pending
  }

  private async classify (element: HTMLElement, state: BackgroundState, urls: string[]): Promise<void> {
    let blocked = false
    let unavailable = false

    for (const url of urls) {
      try {
        const { result, error } = await this.requestToAnalyzeImage(new PredictionRequest(url))
        if (error !== undefined) unavailable = true
        if (result) {
          blocked = true
          break
        }
      } catch {
        unavailable = true
      }
    }

    state.pending = false
    if (this.states.get(element) !== state || !this.active) return

    if (blocked) {
      this.blockedItems++
      element.dataset[this.statusKey] = 'nsfw'
      return
    }

    element.dataset[this.statusKey] = unavailable ? 'unavailable' : 'sfw'
    if (!unavailable) this.restore(element)
  }

  // Removing the image is the only effect that leaves the element alone: blur or
  // visibility on the element would take its text and children with it.
  private hide (element: HTMLElement, state: BackgroundState): void {
    if (this.pseudo !== null) {
      element.setAttribute(this.hiddenAttribute, '')
      return
    }
    if (state.inline === null) {
      const value = element.style.getPropertyValue('background-image')
      // `background: var(--photo)` has no readable longhand, and the override
      // takes the shorthand with it, so the shorthand is what has to come back.
      const shorthand = value === '' && element.style.getPropertyValue('background') !== ''
        ? {
            value: element.style.getPropertyValue('background'),
            priority: element.style.getPropertyPriority('background')
          }
        : null

      state.inline = {
        value,
        priority: element.style.getPropertyPriority('background-image'),
        shorthand,
        attribute: element.hasAttribute('style')
      }
    }

    this.write(element, style => style.set('background-image', 'none', 'important'))
  }

  private overridden (element: HTMLElement): boolean {
    return element.style.getPropertyValue('background-image') === 'none' &&
      element.style.getPropertyPriority('background-image') === 'important'
  }

  private restore (element: HTMLElement): void {
    if (this.pseudo !== null) {
      element.removeAttribute(this.hiddenAttribute)
      return
    }
    const state = this.states.get(element)
    if (state?.inline == null) return

    const { value, priority, shorthand, attribute } = state.inline
    state.inline = null
    // The page overwrote the whole declaration; whatever it wants there now is
    // newer than what we saved.
    if (!this.overridden(element)) return

    this.write(element, style => {
      style.remove('background-image')

      if (shorthand !== null) style.set('background', shorthand.value, shorthand.priority)
      else if (value !== '') style.set('background-image', value, priority)

      if (!attribute && element.style.length === 0) style.dropAttribute()
    })
  }

  // The mutations for a write are delivered to the observer as a microtask, so the
  // credit has to outlive this task and be dropped behind that delivery: a write
  // made while nothing is observing would otherwise eat a later page mutation.
  // One write can touch the declaration more than once, and every touch is a
  // record of its own: crediting one of them leaves us chasing our own writes.
  private write (element: HTMLElement, apply: (style: StyleWriter) => void): void {
    let made = 0
    apply({
      set: (property, value, priority) => {
        element.style.setProperty(property, value, priority)
        made++
      },
      remove: (property) => {
        element.style.removeProperty(property)
        made++
      },
      dropAttribute: () => {
        element.removeAttribute('style')
        made++
      }
    })
    this.writes.set(element, (this.writes.get(element) ?? 0) + made)
    queueMicrotask(() => this.writes.delete(element))
  }

  private filtered (): HTMLElement[] {
    return mediaElements<HTMLElement>(`[${this.statusAttribute}]`)
  }
}
