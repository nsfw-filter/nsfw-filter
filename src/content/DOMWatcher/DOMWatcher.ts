// Highly sensitive code, make sure that you know what you're doing
// https://stackoverflow.com/a/39332340/10432429

// @TODO Canvas and SVG
// @TODO Lazy loading for div.style.background-image?
// @TODO <div> and <a>
// @TODO video

import { IImageFilter } from '../Filter/ImageFilter'

export type IDOMWatcher = {
  watch: () => void
}

export class DOMWatcher implements IDOMWatcher {
  private readonly observer: MutationObserver
  private readonly imageFilter: IImageFilter

  constructor (imageFilter: IImageFilter) {
    this.imageFilter = imageFilter
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

  /**
   * Check the mutation and if title changed analyze every image of document
   * otherwise search for images in changed nodes and analyze them
   * @param mutation MutationRecord
   */
  private checkChildMutation (mutation: MutationRecord): void {
    // @ts-expect-error
    if (mutation.target.nodeName === 'TITLE') this.findAndCheckAllImages(document)

    for (let i = 0; i < mutation.addedNodes.length; i++) {
      if (mutation.addedNodes[i].nodeName === 'IMG') {
        this.imageFilter.analyzeImage(mutation.addedNodes[i] as HTMLImageElement, false)
      } else if (mutation.addedNodes[i].nodeName === 'DIV') {
        this.findAndCheckAllImages(mutation.addedNodes[i] as Element)
      }
    }
  }

  private findAndCheckAllImages (element: Element): void {
    const images = element.getElementsByTagName('img')
    for (let i = 0; i < images.length; i++) {
      this.imageFilter.analyzeImage(images[i], false)
    }
  }

  private checkAttributeMutation (mutation: MutationRecord): void {
    if ((mutation.target as HTMLImageElement).nodeName === 'IMG') {
      this.imageFilter.analyzeImage(mutation.target as HTMLImageElement, mutation.attributeName === 'src')
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
