// Highly sensitive code, make sure that you know what you're doing
// https://stackoverflow.com/a/39332340/10432429

// @TODO Clarify HTML element types
// @TODO Canvas and SVG
// @TODO Lazy loading for div.style.background-image?

import { _Image } from '../Filter/types'
import { IVideoFilter } from '../Filter/VideoFilter'
import { IImageFilter } from '../Filter/ImageFilter'

type IDOMWatcher = {
  watch: () => void
}

export class DOMWatcher implements IDOMWatcher {
  private readonly observer: MutationObserver
  private readonly imageFilter: IImageFilter
  private readonly videoFilter: IVideoFilter

  constructor (imageFilter: IImageFilter, videoFilter: IVideoFilter) {
    this.imageFilter = imageFilter
    this.videoFilter = videoFilter
    this.observer = new MutationObserver(this.callback.bind(this))
  }

  public watch (): void {
    this.observer.observe(document, DOMWatcher.getConfig())
  }

  private callback (mutationsList: MutationRecord[]): void {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length !== 0) {
        this.checkChildMutation(mutation)
      } else if (mutation.type === 'attributes') {
        this.checkAttributeMutation(mutation)
      }
    }
  }

  private checkChildMutation (mutation: MutationRecord): void {
    let shouldCheck: boolean = false

    for (let i = 0; i < mutation.addedNodes.length; i++) {
      if (mutation.addedNodes[i].nodeType !== 1) break
      shouldCheck = true
    }

    if (shouldCheck) {
      const images = (mutation.target as Element).querySelectorAll('img')
      for (let i = 0; i < images.length; i++) {
        // @ts-expect-error
        this.imageFilter.analyzeImage(images[i], false)
      }

      // @TODO improve
      // const divs = (mutation.target as Element).querySelectorAll('div, a')
      // for (let i = 0; i < divs.length; i++) {
      //   // @ts-expect-error
      //   this.imageFilter.analyzeDiv(divs[i])
      // }

      // @TODO improve
      // const videos = (mutation.target as Element).getElementsByTagName('video') as HTMLCollectionOf<Video>
      // for (let i = 0; i < videos.length; i++) {
      //   this.videoFilter.analyzeVideo(videos[i])
      // }
    }
  }

  private checkAttributeMutation (mutation: MutationRecord): void {
    if ((mutation.target as _Image).tagName === 'IMG') {
      this.imageFilter.analyzeImage(mutation.target as _Image, true)
    }

    // @TODO improve
    // if ((mutation.target as Video).tagName === 'VIDEO') {
    //   this.videoFilter.analyzeVideo(mutation.target as Video)
    // }
  }

  private static getConfig (): MutationObserverInit {
    const config = {
      characterData: false,
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src']
    }

    return config
  }
}
