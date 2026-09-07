// Highly sensitive code, make sure that you know what you're doing
// https://stackoverflow.com/a/39332340/10432429

import { IBackgroundImageFilter } from '../Filter/BackgroundImageFilter'
import { ICanvasFilter } from '../Filter/CanvasFilter'
import { IImageFilter, ImageElement } from '../Filter/ImageFilter'
import { IVideoFilter } from '../Filter/VideoFilter'
import { CANVAS_DRAWN, SHADOW_ROOT_CREATED } from '../mediaChanges'
import { mediaRoots, shadowRootOf, MediaRoot } from '../mediaRoots'

import { injectPendingHide } from './pendingStyle'

const STYLE_SHEET = 'link[rel~="stylesheet"], style'
const MEDIA_SELECTOR = 'img,video,canvas,svg image'
const BACKGROUND_EVENTS = ['pointerover', 'pointerout', 'focusin', 'focusout']
// The root sweep visits every element and asks Chrome for a shadow root on each,
// which on a large page costs tens of milliseconds. Most seconds have no new
// roots to find, so it runs when the document has changed, and once every few
// seconds regardless for a root that appeared without a mutation we saw.
const SWEEPS_BETWEEN_FULL = 5

export type IDOMWatcher = {
  watch: () => void
  unwatch: () => void
}

export class DOMWatcher implements IDOMWatcher {
  private readonly observer: MutationObserver
  private readonly imageFilter: IImageFilter
  private readonly videoFilter: IVideoFilter
  private readonly backgroundFilter: IBackgroundImageFilter
  private readonly canvasFilter: ICanvasFilter
  private readonly roots = new Set<MediaRoot>()
  private rootsDirty = true
  private sweeps = 0
  private rootTimer: ReturnType<typeof setInterval> | undefined
  private sheetObservers: Map<Element, MutationObserver>
  private sheetLoads: AbortController
  private registered: WeakSet<Element>
  private watching: boolean

  constructor (
    imageFilter: IImageFilter,
    videoFilter: IVideoFilter,
    backgroundFilter: IBackgroundImageFilter,
    canvasFilter: ICanvasFilter
  ) {
    this.imageFilter = imageFilter
    this.videoFilter = videoFilter
    this.backgroundFilter = backgroundFilter
    this.canvasFilter = canvasFilter
    this.observer = new MutationObserver(this.callback.bind(this))
    this.sheetObservers = new Map()
    this.sheetLoads = new AbortController()
    this.registered = new WeakSet()
    this.watching = false
  }

  // Idempotent: a live enable toggle may call watch() on a page already being
  // watched, and re-sweeping would re-run analyzeImage on every existing image.
  public watch (): void {
    if (this.watching) return
    this.watching = true

    this.observer.observe(document, DOMWatcher.getConfig())
    this.roots.add(document)
    document.addEventListener(SHADOW_ROOT_CREATED, this.onShadowRootCreated)
    document.addEventListener(CANVAS_DRAWN, this.onCanvasDrawn, true)
    this.watchBackgroundInteractions(document)
    injectPendingHide(document)
    // The observer only reports future mutations. Sweep the media already in the
    // DOM so anything parsed before the (async) store resolved is still hidden
    // and classified instead of missed.
    this.findAndCheckAllMedia(document.documentElement)
    this.backgroundFilter.observe(document.documentElement)
    this.watchStyleSheets(document.documentElement)
    // Also discover declarative shadow roots and roots created through an API
    // another script replaced after our drawing/root notifications were installed.
    this.rootTimer = setInterval(() => this.discoverRoots(), 1000)
  }

  // Live pause / allow-list: stop reacting to the page so no new image gets
  // hidden. Revealing the already-filtered ones is ImageFilter.revealAll's job.
  public unwatch (): void {
    if (!this.watching) return
    this.watching = false
    this.observer.disconnect()
    clearInterval(this.rootTimer)
    for (const root of this.roots) {
      root.removeEventListener(CANVAS_DRAWN, this.onCanvasDrawn, true)
      for (const type of BACKGROUND_EVENTS) {
        root.removeEventListener(type, this.onBackgroundInteraction, true)
      }
    }
    this.roots.clear()
    document.removeEventListener(SHADOW_ROOT_CREATED, this.onShadowRootCreated)
    // Every stylesheet gets its own observer, so a stop that left them running
    // would keep both the callbacks and the removed <style> elements alive.
    this.sheetObservers.forEach(observer => observer.disconnect())
    this.sheetObservers.clear()
    this.sheetLoads.abort()
    this.sheetLoads = new AbortController()
    this.registered = new WeakSet()
  }

  private callback (mutationsList: MutationRecord[]): void {
    for (let i = 0; i < mutationsList.length; i++) {
      const mutation = mutationsList[i]
      if (mutation.type === 'childList') {
        this.rootsDirty = true
        // A removed subtree has to give up its override and its pending request,
        // and a stale registration would keep the element alive with the page.
        mutation.removedNodes.forEach(node => {
          if (!(node instanceof Element)) return
          this.backgroundFilter.release(node)
          // Dropping a sheet takes its rules with it, which can expose a
          // background an earlier sheet was overriding.
          if (!this.isStyleSheet(node)) return
          this.backgroundFilter.recheckVisible()
          this.dropStyleSheets(node)
        })
        // A sibling arriving or leaving decides `+`, `~` and `:first-child`, so the
        // element being changed is dirty even when nothing about it moved.
        if (mutation.target instanceof HTMLElement) this.backgroundFilter.checkElement(mutation.target)
        if (mutation.addedNodes.length === 0) continue

        // Registered per added subtree rather than by re-walking the mutation
        // target: a feed appending rows would otherwise re-walk the whole feed
        // on every row.
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return
          this.findAndCheckAllMedia(node)
          this.backgroundFilter.observe(node)
          this.watchStyleSheets(node)
        })
      } else if (mutation.type === 'attributes') {
        this.checkAttributeMutation(mutation)
      }
    }
  }

  // A stylesheet can give an element on screen a background without touching an
  // attribute or an intersection, so its arrival is what prompts the recheck.
  private watchStyleSheets (root: ParentNode): void {
    const sheets = [...root.querySelectorAll(STYLE_SHEET)]
    if (root instanceof Element && root.matches(STYLE_SHEET)) sheets.push(root)
    if (sheets.length === 0) return

    this.backgroundFilter.recheckVisible()
    sheets.forEach(sheet => {
      if (this.registered.has(sheet)) return
      this.registered.add(sheet)

      // A <style> fires load once its @import rules have finished, which is the
      // only signal that those rules exist.
      sheet.addEventListener(
        'load',
        () => this.backgroundFilter.recheckVisible(),
        { signal: this.sheetLoads.signal }
      )
      if (sheet.nodeName === 'LINK') return

      // A <style> is often inserted empty and filled in afterwards, and its rules
      // are text: nothing about that reaches the document-level observer.
      const observer = new MutationObserver(() => this.backgroundFilter.recheckVisible())
      observer.observe(sheet, { characterData: true, childList: true, subtree: true })
      this.sheetObservers.set(sheet, observer)
    })
  }

  // A page that mounts and unmounts styles for every render would otherwise leave
  // an observer, and the detached <style> it holds, behind on each one.
  private dropStyleSheets (root: Element): void {
    const sheets = [...root.querySelectorAll(STYLE_SHEET)]
    if (root.matches(STYLE_SHEET)) sheets.push(root)

    sheets.forEach(sheet => {
      this.sheetObservers.get(sheet)?.disconnect()
      this.sheetObservers.delete(sheet)
      this.registered.delete(sheet)
    })
  }

  // A sheet is usually removed with the container it sits in, not on its own.
  private isStyleSheet (element: Element): boolean {
    return element.matches(STYLE_SHEET) || element.querySelector(STYLE_SHEET) !== null
  }

  private findAndCheckAllMedia (root: ParentNode): void {
    for (const current of mediaRoots(root)) {
      if (current instanceof ShadowRoot) this.watchRoot(current)
      const elements = [...current.querySelectorAll(MEDIA_SELECTOR)]
      if (current instanceof Element && current.matches(MEDIA_SELECTOR)) elements.unshift(current)
      for (const element of elements) {
        if (element instanceof HTMLVideoElement) {
          this.videoFilter.analyzeVideo(element, false)
        } else if (element instanceof HTMLCanvasElement) {
          this.canvasFilter.observe(element)
        } else {
          this.imageFilter.analyzeImage(element as ImageElement)
        }
      }
    }
  }

  private watchRoot (root: ShadowRoot): void {
    if (this.roots.has(root)) return
    this.roots.add(root)
    injectPendingHide(root)
    root.addEventListener(CANVAS_DRAWN, this.onCanvasDrawn, true)
    this.watchBackgroundInteractions(root)
    this.observer.observe(root, DOMWatcher.getConfig())
    for (const child of root.children) this.backgroundFilter.observe(child)
    this.watchStyleSheets(root)
  }

  private discoverRoots (): void {
    if (document.visibilityState !== 'visible') return
    if (!this.rootsDirty && ++this.sweeps % SWEEPS_BETWEEN_FULL !== 0) return
    this.rootsDirty = false
    for (const root of mediaRoots()) {
      if (root instanceof ShadowRoot && !this.roots.has(root)) this.findAndCheckAllMedia(root)
    }
    const detached = [...this.roots].filter(root => root instanceof ShadowRoot && !root.host.isConnected)
    if (detached.length === 0) return
    for (const root of detached) this.roots.delete(root)
    // disconnect() empties the record queue as well as the target list, so drain
    // it first: media in an undelivered record would otherwise never be seen,
    // and the pending rule would keep it hidden.
    this.callback(this.observer.takeRecords())
    this.observer.disconnect()
    for (const root of this.roots) this.observer.observe(root, DOMWatcher.getConfig())
  }

  // The page world sends the host element; a closed root is resolved here rather
  // than handed out where any script on the page could pick it up.
  private readonly onShadowRootCreated = (event: Event): void => {
    if (!this.watching) return
    const host: unknown = (event as CustomEvent).detail
    if (!(host instanceof Element)) return
    const root = shadowRootOf(host)
    if (root !== null) this.findAndCheckAllMedia(root)
  }

  private readonly onCanvasDrawn = (event: Event): void => {
    if (!this.watching) return
    const canvas = event.composedPath()[0]
    if (canvas instanceof HTMLCanvasElement && event.currentTarget === canvas.getRootNode()) {
      this.canvasFilter.observe(canvas, true)
    }
  }

  // Hover and focus can change CSS without changing the DOM. Listen inside each
  // shadow root too: interactions between its children may not leave that root.
  private watchBackgroundInteractions (root: MediaRoot): void {
    for (const type of BACKGROUND_EVENTS) {
      root.addEventListener(type, this.onBackgroundInteraction, true)
    }
  }

  private readonly onBackgroundInteraction = (): void => {
    if (this.watching) this.backgroundFilter.recheckVisible()
  }

  // Five kinds of element can be affected by one attribute change, and an
  // element can be more than one of them: a canvas carries its own background,
  // an <img> can too. Each check decides for itself whether it applies.
  private checkAttributeMutation (mutation: MutationRecord): void {
    const node = mutation.target
    const attribute = mutation.attributeName

    if (node instanceof SVGElement && node.localName === 'image') {
      this.checkImageElement(node as SVGImageElement, attribute)
      return
    }
    if (!(node instanceof HTMLElement)) return

    if (node instanceof HTMLCanvasElement) this.checkCanvas(node, attribute)
    if (node instanceof HTMLSourceElement) this.checkPictureSource(node)
    this.checkBackground(node, attribute)

    if (node instanceof HTMLImageElement) this.checkImageElement(node, attribute)
    else if (node instanceof HTMLVideoElement) this.checkVideo(node, attribute)
  }

  // A style change is the page overwriting the effect we applied, not a new
  // image to classify.
  private checkImageElement (image: ImageElement, attribute: string | null): void {
    if (attribute === 'style') this.imageFilter.checkStyleMutation(image)
    else this.imageFilter.analyzeImage(image)
  }

  private checkCanvas (canvas: HTMLCanvasElement, attribute: string | null): void {
    if (attribute === 'style') this.canvasFilter.checkStyleMutation(canvas)
    else this.canvasFilter.observe(canvas)
  }

  // The <img> is what renders; a <source> only changes what it selects.
  private checkPictureSource (source: HTMLSourceElement): void {
    if (!(source.parentElement instanceof HTMLPictureElement)) return
    const image = source.parentElement.querySelector('img')
    if (image !== null) this.imageFilter.analyzeImage(image)
  }

  // A class, id or hidden change can bring in a rule carrying a background
  // image; a style change can set one directly.
  private checkBackground (element: HTMLElement, attribute: string | null): void {
    if (attribute === 'style') this.backgroundFilter.checkStyleMutation(element)
    else if (attribute !== 'src' && attribute !== 'poster') this.backgroundFilter.checkElement(element)
  }

  // A src swap fires loadstart, which VideoFilter already treats as new media; a
  // poster swap fires nothing, so it has to come from here. It replaces the
  // preview, not the footage, and so is not a media change.
  private checkVideo (video: HTMLVideoElement, attribute: string | null): void {
    if (attribute === 'style') this.videoFilter.checkStyleMutation(video)
    else if (attribute === 'poster') this.videoFilter.checkPoster(video)
    else this.videoFilter.analyzeVideo(video, false)
  }

  // Backgrounds selected through other attributes, through CSSOM insertRule, or
  // through adopted stylesheets are not covered: watching every attribute would
  // re-read the visible set on any page that animates one. Nor are selectors that
  // reach outside the changed element's parent, :has() above all, for the same
  // reason: a mutation there rechecks that subtree only.
  private static getConfig (): MutationObserverInit {
    return {
      characterData: false,
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'src', 'srcset', 'sizes', 'href', 'xlink:href', 'media', 'type',
        'width', 'height', 'style', 'poster', 'class', 'id', 'hidden'
      ]
    }
  }
}
