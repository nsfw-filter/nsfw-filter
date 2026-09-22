import { PredictionRequest } from '../../utils/messages'
import { mediaElements } from '../mediaRoots'

import { backgroundImageUrls } from './backgroundImageValue'
import { Filter, MIN_MEDIA_SIZE, OFFSCREEN_MARGIN } from './Filter'

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

type BackgroundLayer = {
  pseudo: 'before' | 'after' | null
  statusKey: string
  states: WeakMap<HTMLElement, BackgroundState>
}

// Past this many dirty roots, testing every visible element against each of them
// costs more than simply re-reading the visible set.
const DIRTY_ROOT_LIMIT = 8
// A drag fires resize continuously; one recheck per quarter second is enough to
// catch a breakpoint being crossed.
const RESIZE_INTERVAL = 250
// Elements that never paint a background, so walking into them is wasted work.
const SKIPPED = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'TEMPLATE', 'NOSCRIPT', 'BR'])

export class BackgroundImageFilter extends Filter implements IBackgroundImageFilter {
  private readonly visible: Set<HTMLElement>
  private readonly writes: WeakMap<HTMLElement, number>
  private readonly dirty: Set<HTMLElement>
  private readonly viewport: IntersectionObserver
  private allDirty: boolean
  private scheduled: boolean
  private resizeTimer: ReturnType<typeof setTimeout> | undefined
  private active: boolean

  // All three backgrounds share discovery, viewport tracking and scheduling.
  // Only their source, verdict and saved declaration belong to separate layers.
  private readonly layers: BackgroundLayer[] = [
    { pseudo: null, statusKey: 'nsfwFilterBackgroundStatus', states: new WeakMap() },
    { pseudo: 'before', statusKey: 'nsfwFilterBeforeStatus', states: new WeakMap() },
    { pseudo: 'after', statusKey: 'nsfwFilterAfterStatus', states: new WeakMap() }
  ]

  constructor () {
    super()
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
    if (!this.active) return

    this.walk(root, element => {
      this.viewport.observe(element)
      // Observing an element again produces no notification, so an element we have
      // already judged and that moved here needs an explicit re-read: its new
      // parent can select a different background.
      if (this.layers.some(layer => layer.states.has(element))) this.markDirty(element)
    })
  }

  // A removed subtree keeps its override and its pending request otherwise, which
  // leaves the background missing for good if the element comes back.
  public release (root: Element): void {
    this.walk(root, element => {
      if (element.isConnected) {
        // Moved rather than removed: keep it hidden and force a fresh verdict. Its
        // registration still stands, and an element that stays on screen through
        // the move gets no new notification, so it keeps its place in `visible`.
        for (const layer of this.layers) {
          const state = layer.states.get(element)
          if (state !== undefined) state.key = ''
        }
        this.markDirty(element)
        return
      }

      this.visible.delete(element)
      this.dirty.delete(element)
      this.viewport.unobserve(element)
      for (const layer of this.layers) this.clear(element, layer)
    })
  }

  // A class change can swap the background of the element itself or of anything
  // under it, and a rule that now matches produces no new intersection.
  public checkElement (element: HTMLElement): void {
    this.markDirty(element)
  }

  // Some sites rewrite inline styles on every render, which takes our override
  // with them. Each of our own writes accounts for exactly one mutation, so they
  // are counted off one by one: an intact override proves nothing, and a page that
  // writes in reaction to ours must not be swallowed along with it.
  public checkStyleMutation (element: HTMLElement): void {
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
    if (!this.active) return
    this.allDirty = true
    this.schedule()
  }

  // A live effect change doesn't alter a verdict. Backgrounds are removed rather
  // than blurred whatever the effect is, so there is nothing to re-render; the
  // hook exists so content.ts can treat both filters the same.
  public applyEffectToBlocked (): void {}

  public revealAll (): void {
    const selector = '[data-nsfw-filter-background-status], [data-nsfw-filter-before-status], [data-nsfw-filter-after-status]'
    for (const element of mediaElements<HTMLElement>(selector)) {
      for (const layer of this.layers) this.clear(element, layer)
    }
  }

  // Resuming produces no new intersection for targets already registered, so what
  // is on screen has to be re-read here or it stays revealed.
  public start (): void {
    this.active = true
    this.recheckVisible()
  }

  // Live pause or allow-list. Restoring what we removed is revealAll's job.
  public stop (): void {
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
      if (!this.visible.has(root) && !this.layers.some(layer => root.dataset[layer.statusKey] !== undefined)) continue
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
    for (const layer of this.layers) this.analyzeLayer(element, layer)
  }

  private analyzeLayer (element: HTMLElement, layer: BackgroundLayer): void {
    // Icons, sprites and spacers: too small to be worth a round trip. The root
    // and the body are exempt: their background paints the whole canvas whatever
    // box they happen to have.
    if (layer.pseudo === null) {
      const { width, height } = element.getBoundingClientRect()
      const canvas = element === document.body || element === document.documentElement
      if (!canvas && (width <= MIN_MEDIA_SIZE || height <= MIN_MEDIA_SIZE)) {
        if (width > 0 && height > 0) {
          this.clear(element, layer)
          element.dataset[layer.statusKey] = 'sfw'
        }
        return
      }
    }

    const state = layer.states.get(element)
    // Our own override masks the author's value, so the page's current background
    // has to be read with it lifted. Both writes land in this task, before paint.
    if (state !== undefined) this.restore(element, layer)

    // Lift the pending stylesheet only while reading the author's background.
    // A real image is hidden again below in the same task, before paint.
    if (element.dataset[layer.statusKey] === undefined) {
      element.dataset[layer.statusKey] = 'processing'
    }

    const computed = layer.pseudo === null
      ? getComputedStyle(element)
      : getComputedStyle(element, `::${layer.pseudo}`)
    // A pseudo-element without content is not generated, even if a rule gives
    // it a background. Its host's size tells us nothing about a generated one.
    const generated = layer.pseudo === null || !['', 'none', 'normal'].includes(computed.content)
    const urls = generated ? backgroundImageUrls(computed.backgroundImage) : []
    const key = urls.join(' ')
    if (urls.length === 0) {
      layer.states.delete(element)
      if (element.dataset[layer.statusKey] !== 'sfw') element.dataset[layer.statusKey] = 'sfw'
      return
    }

    const status = element.dataset[layer.statusKey]
    if (state !== undefined && state.key === key && status !== undefined && (status !== 'processing' || state.pending)) {
      // Put the effect back if it was a block, since restore() lifted it.
      if (status !== 'sfw') this.hide(element, state, layer)
      return
    }

    const generation = (state?.generation ?? 0) + 1
    const next: BackgroundState = { generation, key, pending: true, inline: null }
    layer.states.set(element, next)
    element.dataset[layer.statusKey] = 'processing'
    this.hide(element, next, layer)

    void this.classify(element, next, urls, layer)
  }

  // One unsafe layer condemns the stack: the layers are positioned against each
  // other, and dropping only one leaves the rest misaligned over a gap.
  private async classify (
    element: HTMLElement,
    state: BackgroundState,
    urls: string[],
    layer: BackgroundLayer
  ): Promise<void> {
    let blocked = false
    let unavailable = false

    for (const url of urls) {
      try {
        const { result } = await this.requestToAnalyzeImage(new PredictionRequest(url))
        if (result) {
          blocked = true
          break
        }
      } catch {
        unavailable = true
      }
    }

    state.pending = false
    if (layer.states.get(element) !== state || !this.active) return

    if (blocked) {
      this.blockedItems++
      element.dataset[layer.statusKey] = 'nsfw'
      return
    }

    if (unavailable) {
      element.dataset[layer.statusKey] = 'unavailable'
      return
    }

    element.dataset[layer.statusKey] = 'sfw'
    this.restore(element, layer)
  }

  // Removing the image is the only effect that leaves the element alone: blur or
  // visibility on the element would take its text and children with it.
  private hide (element: HTMLElement, state: BackgroundState, layer: BackgroundLayer): void {
    if (layer.pseudo !== null) {
      element.setAttribute(`data-nsfw-filter-${layer.pseudo}-hidden`, '')
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

    this.write(element, () => {
      element.style.setProperty('background-image', 'none', 'important')
      return 1
    })
  }

  private overridden (element: HTMLElement): boolean {
    return element.style.getPropertyValue('background-image') === 'none' &&
      element.style.getPropertyPriority('background-image') === 'important'
  }

  private restore (element: HTMLElement, layer: BackgroundLayer): void {
    if (layer.pseudo !== null) {
      element.removeAttribute(`data-nsfw-filter-${layer.pseudo}-hidden`)
      return
    }
    const state = layer.states.get(element)
    if (state?.inline == null) return

    const { value, priority, shorthand, attribute } = state.inline
    state.inline = null
    // The page overwrote the whole declaration; whatever it wants there now is
    // newer than what we saved.
    if (!this.overridden(element)) return

    this.write(element, () => {
      element.style.removeProperty('background-image')
      let mutations = 1

      if (shorthand !== null) {
        element.style.setProperty('background', shorthand.value, shorthand.priority)
        mutations++
      } else if (value !== '') {
        element.style.setProperty('background-image', value, priority)
        mutations++
      }

      if (!attribute && element.style.length === 0) {
        element.removeAttribute('style')
        mutations++
      }

      return mutations
    })
  }

  // The mutations for a write are delivered to the observer as a microtask, so the
  // credit has to outlive this task and be dropped behind that delivery: a write
  // made while nothing is observing would otherwise eat a later page mutation.
  // One write can touch the declaration more than once, and every touch is a
  // record of its own: crediting one of them leaves us chasing our own writes.
  private write (element: HTMLElement, apply: () => number): void {
    const made = apply()
    this.writes.set(element, (this.writes.get(element) ?? 0) + made)
    queueMicrotask(() => this.writes.delete(element))
  }

  private clear (element: HTMLElement, layer: BackgroundLayer): void {
    this.restore(element, layer)
    layer.states.delete(element)
    delete element.dataset[layer.statusKey]
  }
}
