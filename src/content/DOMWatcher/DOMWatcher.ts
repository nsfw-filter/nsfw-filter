// Highly sensitive code, make sure that you know what you're doing
// https://stackoverflow.com/a/39332340/10432429

// @TODO Canvas and SVG
// @TODO Lazy loading for div.style.background-image?
// @TODO <div> and <a>

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
  private watching: boolean

  constructor (imageFilter: IImageFilter, videoFilter: IVideoFilter) {
    this.imageFilter = imageFilter
    this.videoFilter = videoFilter
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
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        this.findAndCheckAllMedia(mutation.target as Element)
      } else if (mutation.type === 'attributes') {
        this.checkAttributeMutation(mutation)
      }
    }
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
    const node = mutation.target as Element
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
      attributeFilter: ['src', 'style', 'poster']
    }
  }
}
