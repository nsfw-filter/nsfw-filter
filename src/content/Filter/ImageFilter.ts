import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide' | 'grayscale'
  isFeatureActive: true | false
}

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  setSettings: (settings: imageFilterSettingsType) => void
}

export class ImageFilter extends Filter implements IImageFilter {
  private readonly MIN_IMAGE_SIZE: number
  private readonly imageSet: Set<HTMLImageElement>
  private settings: imageFilterSettingsType

  constructor () {
    super()
    this.MIN_IMAGE_SIZE = 41
    this.imageSet = new Set<HTMLImageElement>()
    this.settings = { filterEffect: 'hide', isFeatureActive: true }
  }

  public setSettings (settings: imageFilterSettingsType): void {
    this.settings = settings
    if (this.imageSet.size !== 0) {
      this.imageSet.forEach(image => {
        if (settings.isFeatureActive) {
          this.filterNsfwImage(image, image.src)
        } else {
          this.toggleVisibilityOfNsfwImage(image)
        }
      })
    }
  }

  public getFeatureStatus (): boolean {
    return this.settings.isFeatureActive
  }

  public analyzeImage (image: HTMLImageElement, srcAttribute: boolean = false): void {
    if (
      (srcAttribute || image.dataset.nsfwFilterStatus === undefined) &&
      image.src.length > 0 &&
      (
        (image.width > this.MIN_IMAGE_SIZE && image.height > this.MIN_IMAGE_SIZE) ||
        image.height === 0 ||
        image.width === 0
      )
    ) {
      image.dataset.nsfwFilterStatus = 'processing'
      this._analyzeImage(image)
    }
  }

  private _analyzeImage (image: HTMLImageElement): void {
    this.hideImage(image)

    const request = new PredictionRequest(image.src)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (result) {
          this.blockedItems++
          this.imageSet.add(image)
        } else {
          this.showSFWImage(image, url)
        }
      }).catch(({ url }) => {
        this.showSFWImage(image, url)
      })
  }

  private hideImage (image: HTMLImageElement): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = true

    image.style.visibility = 'hidden'
  }

  private toggleVisibilityOfNsfwImage (image: HTMLImageElement): void {
    image.style.visibility = 'visible'
    image.style.filter = 'none'
  }

  private filterNsfwImage (image: HTMLImageElement, url: string): void {
    if (image.src === url) {
      if (this.settings.filterEffect === 'blur') {
        image.style.filter = 'blur(25px)'
      } else if (this.settings.filterEffect === 'grayscale') {
        image.style.filter = 'grayscale(1)'
      }
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false
      image.style.visibility = 'visible'
    }
  }

  private showSFWImage (image: HTMLImageElement, url: string): void {
    if (image.src === url) {
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false

      image.style.visibility = 'visible'
      image.dataset.nsfwFilterStatus = 'sfw'
      image.style.filter = 'none'
    }
  }
}
