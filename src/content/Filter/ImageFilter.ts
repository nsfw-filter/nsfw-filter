import { PredictionRequest } from '../../utils/messages'
import { mediaElements } from '../mediaRoots'

import { Filter, FilterSettings } from './Filter'

export type ImageElement = HTMLImageElement | SVGImageElement

export type IImageFilter = {
  analyzeImage: (image: ImageElement) => void
  setSettings: (settings: FilterSettings) => void
  revealImage: (image: ImageElement) => void
  checkStyleMutation: (image: ImageElement) => void
  applyEffectToBlocked: () => void
  revealAll: () => void
  start: () => void
  stop: () => void
}

const IMAGE_SELECTOR = 'img,svg image'

export class ImageFilter extends Filter implements IImageFilter {
  private epoch = 0
  private active = true
  private unhidden = new WeakSet<ImageElement>()
  private readonly sources = new WeakMap<ImageElement, string>()
  private readonly wired = new WeakSet<ImageElement>()
  private readonly smallImages = new WeakSet<ImageElement>()

  public revealImage (image: ImageElement): void {
    this.unhidden.add(image)
    this.revealElement(image)
    image.dataset.nsfwFilterStatus = 'sfw'
  }

  public analyzeImage (image: ImageElement): void {
    if (!this.active) return
    if (!this.wired.has(image)) {
      this.wired.add(image)
      // Responsive selection can change without a src mutation (picture, sizes,
      // viewport or pixel density). load tells us which resource Chrome chose.
      image.addEventListener('load', () => this.analyzeImage(image))
    }

    const source = this.sourceOf(image)
    const previous = this.sources.get(image)
    const status = image.dataset.nsfwFilterStatus
    if (source === previous && status !== undefined && !this.smallImages.has(image)) return
    if (source !== previous) this.unhidden.delete(image)
    this.sources.set(image, source)

    if (source === '') {
      this.revealElement(image)
      delete image.dataset.nsfwFilterStatus
      return
    }

    const { width, height } = image instanceof HTMLImageElement
      ? image
      : image.getBoundingClientRect()
    if (this.belowMinSize(width, height)) {
      this.smallImages.add(image)
      // Small images are re-measured on every call, so only write when the tag
      // is not already the one this would set.
      if (status !== 'nsfw' && status !== 'sfw') this.showImage(image)
      return
    }

    this.smallImages.delete(image)
    image.dataset.nsfwFilterStatus = 'processing'
    this.hideElement(image)
    void this._analyzeImage(image)
  }

  public checkStyleMutation (image: ImageElement): void {
    if (this.smallImages.has(image)) this.analyzeImage(image)
    super.checkStyleMutation(image)
  }

  public applyEffectToBlocked (): void {
    for (const image of mediaElements<ImageElement>(IMAGE_SELECTOR)) {
      if (this.isBlocked(image)) this.applyEffect(image)
    }
  }

  public revealAll (): void {
    this.epoch++
    this.unhidden = new WeakSet()
    for (const image of mediaElements<ImageElement>(IMAGE_SELECTOR)) {
      if (image.dataset.nsfwFilterStatus === undefined) continue
      this.revealElement(image)
      this.sources.delete(image)
      delete image.dataset.nsfwFilterStatus
    }
  }

  public start (): void {
    this.active = true
  }

  public stop (): void {
    this.active = false
    this.epoch++
  }

  private sourceOf (image: ImageElement): string {
    if (image instanceof HTMLImageElement) return image.currentSrc || image.src
    const href = image.href.baseVal
    try {
      return href === '' ? '' : new URL(href, image.baseURI).href
    } catch {
      // Let image loading report an invalid source without interrupting the scan.
      return href
    }
  }

  private async _analyzeImage (image: ImageElement): Promise<void> {
    const source = this.sourceOf(image)
    const epoch = this.epoch
    const current = (): boolean =>
      this.epoch === epoch && this.sourceOf(image) === source && !this.unhidden.has(image)

    try {
      const { result, error } = await this.requestToAnalyzeImage(new PredictionRequest(source))
      if (!current()) return
      if (error !== undefined) {
        this.markUnavailable(image)
      } else if (result) {
        this.blockedItems++
        image.dataset.nsfwFilterStatus = 'nsfw'
        this.applyEffect(image)
      } else {
        this.showImage(image)
      }
    } catch {
      if (current()) this.markUnavailable(image)
    }
  }

  private markUnavailable (image: ImageElement): void {
    image.dataset.nsfwFilterStatus = 'unavailable'
    this.applyEffect(image)
  }

  private showImage (image: ImageElement): void {
    image.dataset.nsfwFilterStatus = 'sfw'
    this.revealElement(image)
  }
}
