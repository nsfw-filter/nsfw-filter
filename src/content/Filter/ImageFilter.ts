import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide' | 'grayscale'
}

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  setSettings: (settings: imageFilterSettingsType) => void
  checkStyleMutation: (image: HTMLImageElement) => void
}

export class ImageFilter extends Filter implements IImageFilter {
  private readonly MIN_IMAGE_SIZE: number
  private settings: imageFilterSettingsType

  constructor () {
    super()
    this.MIN_IMAGE_SIZE = 41

    this.settings = { filterEffect: 'hide' }
  }

  public setSettings (settings: imageFilterSettingsType): void {
    this.settings = settings
  }

  public analyzeImage (image: HTMLImageElement, srcAttribute: boolean = false): void {
    const imageIsNotAnalyzed = srcAttribute || image.dataset.nsfwFilterStatus === undefined
    const isImageValid = image.src.length > 0 && ((image.width > this.MIN_IMAGE_SIZE && image.height > this.MIN_IMAGE_SIZE) || image.height === 0 || image.width === 0)

    if (imageIsNotAnalyzed && isImageValid) {
      image.dataset.nsfwFilterStatus = 'processing'
      this._analyzeImage(image)
    }
  }

  public checkStyleMutation (image: HTMLImageElement): void {
    const isStyleOutdated = this.isStyleOutdated(image)

    if (!isStyleOutdated) return

    this.applyFilter(image, image.src)
  }

  private isStyleOutdated (image: HTMLImageElement): boolean {
    const isImageNSFW = image.dataset.nsfwFilterStatus === 'nsfw'

    if (!isImageNSFW) return false

    const isVisibilityHiddenOutdated = this.settings.filterEffect === 'hide' && image.getAttribute('style')?.includes('visibility: hidden') === false
    const isBlurOutdated = this.settings.filterEffect === 'blur' && image.getAttribute('style')?.includes('filter: blur') === false
    const isGrayscaleOutdated = this.settings.filterEffect === 'grayscale' && image.getAttribute('style')?.includes('filter: grayscale') === false

    return isVisibilityHiddenOutdated || isBlurOutdated || isGrayscaleOutdated
  }

  private _analyzeImage (image: HTMLImageElement): void {
    this.hideImage(image)

    const request = new PredictionRequest(image.src)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (result) {
          this.applyFilter(image, url)

          this.blockedItems++
          image.dataset.nsfwFilterStatus = 'nsfw'
        } else {
          this.showImage(image, url)
        }
      }).catch(({ url }) => {
        this.showImage(image, url)
      })
  }

  private applyFilter (image: HTMLImageElement, url: string): void {
    if (this.settings.filterEffect === 'blur') {
      image.style.filter = 'blur(25px)'
      this.showImage(image, url)
      return
    }

    if (this.settings.filterEffect === 'grayscale') {
      image.style.filter = 'grayscale(1)'
      this.showImage(image, url)
      return
    }

    this.hideImage(image)
  }

  private hideImage (image: HTMLImageElement): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = true

    image.style.visibility = 'hidden'
  }

  private showImage (image: HTMLImageElement, url: string): void {
    if (image.src === url) {
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false

      image.dataset.nsfwFilterStatus = 'sfw'
      image.style.visibility = 'visible'
    }
  }
}
