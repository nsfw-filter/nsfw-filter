// Highly sensitive code, make sure that you know what you're doing
// https://stackoverflow.com/a/39332340/10432429

// @TODO Canvas and SVG
// @TODO Lazy loading for div.style.background-image?
// @TODO <div> and <a>
// @TODO video

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
    for (let i = 0; i < mutationsList.length; i++) {
      const mutation = mutationsList[i]
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        this.checkChildMutation(mutation)
      } else if (mutation.type === 'attributes') {
        this.checkAttributeMutation(mutation)
      }
    }
  }

  private checkChildMutation (mutation: MutationRecord): void {
    if (mutation.target.nodeName === 'TITLE') {
      const images = document.getElementsByTagName('img')
      for (let i = 0; i < images.length; i++) {
        this.imageFilter.analyzeImage(images[i] as _Image, false)
      }
    }

    for (let i = 0; i < mutation.addedNodes.length; i++) {
      if (mutation.addedNodes[i].nodeName === 'IMG') {
        this.imageFilter.analyzeImage(mutation.addedNodes[i] as _Image, false)
      }
    }
  }

  private checkAttributeMutation (mutation: MutationRecord): void {
    if ((mutation.target as _Image).nodeName === 'IMG') {
      this.imageFilter.analyzeImage(mutation.target as _Image, mutation.attributeName === 'src')
    }
  }

  private static getConfig (): MutationObserverInit {
    return {
      characterData: false,
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src']
    }
  }
}
