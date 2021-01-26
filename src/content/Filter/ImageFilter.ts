import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide'
}

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  analyzeBgImage: (image: HTMLElement, url: string) => void
  setSettings: (settings: imageFilterSettingsType) => void
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
    if (
      image.src.length > 0 &&
      ((image.width > this.MIN_IMAGE_SIZE && image.height > this.MIN_IMAGE_SIZE) || image.height === 0 || image.width === 0)
    ) {
      if (srcAttribute) {
        this._analyzeImage(image)
      } else if (image.dataset.nsfwFilterStatus === undefined) {
        this._analyzeImage(image)
      }
    }
  }

  private _analyzeImage (image: HTMLImageElement): void {
    this.hideImage(image)

    const request = new PredictionRequest(image.src)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (result) {
          if (this.settings.filterEffect === 'blur') {
            image.style.filter = 'blur(25px)'
            this.showImage(image, url)
          }

          this.blockedItems++
          image.dataset.nsfwFilterStatus = 'nsfw'
        } else {
          this.showImage(image, url)
        }
      }).catch(({ url }) => {
        this.showImage(image, url)
      })
  }

  private hideImage (image: HTMLImageElement): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = true

    image.dataset.nsfwFilterStatus = 'processing'
    image.style.visibility = 'hidden'
  }

  private showImage (image: HTMLImageElement, url: string): void {
    if (image.src === url) {
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false

      image.dataset.nsfwFilterStatus = 'sfw'
      image.style.visibility = 'visible'
    }
  }

  public analyzeBgImage (image: HTMLElement, url: string): void {
    this.hideBgImage(image)
    const request = new PredictionRequest(url)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (result) {
          if (this.settings.filterEffect === 'blur') {
            image.style.filter = 'blur(25px)'
            this.showBgImage(image, url)
          }

          this.blockedItems++
          image.dataset.nsfwFilterStatus = 'nsfw'
        } else {
          this.showBgImage(image, url)
        }
      }).catch(({ url }) => {
        this.showBgImage(image, url)
      })
  }

  private hideBgImage (image: HTMLElement): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = true

    image.dataset.nsfwFilterStatus = 'processing'
    image.style.visibility = 'hidden'
  }

  private showBgImage (image: HTMLElement, url: string): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = false

    image.dataset.nsfwFilterStatus = 'sfw'
    image.style.visibility = 'visible'
  }
}
