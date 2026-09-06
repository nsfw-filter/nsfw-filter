// Highly sensitive code, make sure that you know what you're doing
// https://stackoverflow.com/a/39332340/10432429

// @TODO Canvas and SVG

import { IBackgroundImageFilter } from '../Filter/BackgroundImageFilter'
import { IImageFilter } from '../Filter/ImageFilter'
import { IVideoFilter } from '../Filter/VideoFilter'

const STYLE_SHEET = 'link[rel~="stylesheet"], style'

export type IDOMWatcher = {
  watch: () => void
  unwatch: () => void
}

export class DOMWatcher implements IDOMWatcher {
  private readonly observer: MutationObserver
  private readonly imageFilter: IImageFilter
  private readonly videoFilter: IVideoFilter
  private readonly backgroundFilter: IBackgroundImageFilter
  private sheetObservers: Map<Element, MutationObserver>
  private sheetLoads: AbortController
  private registered: WeakSet<Element>
  private watching: boolean

  constructor (
    imageFilter: IImageFilter,
    videoFilter: IVideoFilter,
    backgroundFilter: IBackgroundImageFilter
  ) {
    this.imageFilter = imageFilter
    this.videoFilter = videoFilter
    this.backgroundFilter = backgroundFilter
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
    // The observer only reports future mutations. Sweep the media already in the
    // DOM so anything parsed before the (async) store resolved is still hidden
    // and classified instead of missed.
    this.findAndCheckAllMedia(document.documentElement)
    this.backgroundFilter.observe(document.documentElement)
    this.watchStyleSheets(document.documentElement)
  }

  // Live pause / allow-list: stop reacting to the page so no new image gets
  // hidden. Revealing the already-filtered ones is ImageFilter.revealAll's job.
  public unwatch (): void {
    if (!this.watching) return
    this.watching = false
    this.observer.disconnect()
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

        this.findAndCheckAllMedia(mutation.target as Element)
        // Backgrounds are registered per added subtree rather than by re-walking
        // the mutation target: a feed appending rows would otherwise re-walk the
        // whole feed on every row.
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return
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
  private watchStyleSheets (root: Element): void {
    const sheets = [...root.querySelectorAll(STYLE_SHEET)]
    if (root.matches(STYLE_SHEET)) sheets.push(root)
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

  private findAndCheckAllMedia (element: Element): void {
    const images = element.getElementsByTagName('img')
    for (let i = 0; i < images.length; i++) {
      this.imageFilter.analyzeImage(images[i], false)
    }

    const videos = element.getElementsByTagName('video')
    for (let i = 0; i < videos.length; i++) {
      this.videoFilter.analyzeVideo(videos[i], false)
    }
  }

  private checkAttributeMutation (mutation: MutationRecord): void {
    const node = mutation.target
    if (!(node instanceof HTMLElement)) return

    // A class, id or hidden change can bring in a rule carrying a background
    // image; a style change can set one directly. An <img> can carry one too, so
    // this runs for images as well as for everything else.
    if (mutation.attributeName === 'style') {
      this.backgroundFilter.checkStyleMutation(node)
    } else if (mutation.attributeName !== 'src' && mutation.attributeName !== 'poster') {
      this.backgroundFilter.checkElement(node)
    }

    if (node.nodeName === 'IMG') {
      const image = node as HTMLImageElement
      // A style change is the page overwriting our effect (see checkStyleMutation),
      // not a new image to classify.
      if (mutation.attributeName === 'style') {
        this.imageFilter.checkStyleMutation(image)
        return
      }

      this.imageFilter.analyzeImage(image, mutation.attributeName === 'src')
      return
    }

    if (node.nodeName !== 'VIDEO') return

    const video = node as HTMLVideoElement
    if (mutation.attributeName === 'style') {
      this.videoFilter.checkStyleMutation(video)
      return
    }

    // A src swap fires loadstart, which VideoFilter already treats as new media;
    // a poster swap fires nothing, so it has to come from here. It replaces the
    // preview, not the footage, and so is not a media change.
    if (mutation.attributeName === 'poster') {
      this.videoFilter.checkPoster(video)
      return
    }

    this.videoFilter.analyzeVideo(video, false)
  }

  // Backgrounds selected through other attributes, through CSSOM insertRule, or
  // through adopted stylesheets and shadow roots are not covered: watching every
  // attribute would re-read the visible set on any page that animates one. Nor
  // are selectors that reach outside the changed element's parent, :has() above
  // all, for the same reason: a mutation there rechecks that subtree only.
  private static getConfig (): MutationObserverInit {
    return {
      characterData: false,
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'poster', 'class', 'id', 'hidden']
    }
  }
}
