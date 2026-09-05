// Highly sensitive code, make sure that you know what you're doing
// https://stackoverflow.com/a/39332340/10432429

// @TODO Canvas and SVG

import { IBackgroundImageFilter } from '../Filter/BackgroundImageFilter'
import { IImageFilter } from '../Filter/ImageFilter'
import { IVideoFilter } from '../Filter/VideoFilter'

export type IDOMWatcher = {
  watch: () => void
  unwatch: () => void
}

export class DOMWatcher implements IDOMWatcher {
  private readonly observer: MutationObserver
  private readonly imageFilter: IImageFilter
  private readonly videoFilter: IVideoFilter
  private readonly backgroundFilter: IBackgroundImageFilter
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
  }

  private callback (mutationsList: MutationRecord[]): void {
    for (let i = 0; i < mutationsList.length; i++) {
      const mutation = mutationsList[i]
      if (mutation.type === 'childList') {
        // A removed subtree has to give up its override and its pending request,
        // and a stale registration would keep the element alive with the page.
        mutation.removedNodes.forEach(node => {
          if (node instanceof Element) this.backgroundFilter.release(node)
        })
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
    const sheets = [...root.querySelectorAll('link[rel~="stylesheet"], style')]
    if (root.matches('link[rel~="stylesheet"], style')) sheets.push(root)
    if (sheets.length === 0) return

    this.backgroundFilter.recheckVisible()
    sheets.forEach(sheet => {
      if (sheet.nodeName === 'LINK') {
        sheet.addEventListener('load', () => this.backgroundFilter.recheckVisible())
        return
      }

      // A <style> is often inserted empty and filled in afterwards, and its rules
      // are text: nothing about that reaches the document-level observer.
      new MutationObserver(() => this.backgroundFilter.recheckVisible())
        .observe(sheet, { characterData: true, childList: true, subtree: true })
    })
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

    // A class change can bring in a rule carrying a background image; a style
    // change can set one directly. An <img> can carry one too, so this runs for
    // images as well as for everything else.
    if (mutation.attributeName === 'style') {
      this.backgroundFilter.checkStyleMutation(node)
    } else if (mutation.attributeName === 'class') {
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

  private static getConfig (): MutationObserverInit {
    return {
      characterData: false,
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'poster', 'class']
    }
  }
}
