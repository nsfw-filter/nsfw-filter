import { ILogger } from 'utils/Logger'

import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide'
}

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  setSettings: (settings: imageFilterSettingsType) => void
}

export class ImageFilter extends Filter implements IImageFilter {
  private readonly MIN_IMAGE_SIZE: number
  private settings: imageFilterSettingsType

  constructor (_logger: ILogger) {
    super(_logger)
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
    this.logger.log(`Analyze image ${image.src}`)

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

  // public async analyzeDiv(div: _Image): Promise<void> {
  //   if (div._isChecked === undefined && typeof div.style.backgroundImage === 'string' && div.style.backgroundImage.length > 0) {
  //     div._isChecked = true
  //     this.hideImage(div)

  //     const url: string | undefined = ImageFilter.prepareUrl(div.style.backgroundImage.slice(5, -2))
  //     if (url === undefined) return

  //     const request = new PredictionRequest(url)
  //     this.requestToAnalyzeImage(request)
  //       .then(result => {
  //         if (result) {
  //           this.blockedItems++
  //         } else {
  //           this.showImage(div)
  //         }
  //       }).catch(_error => {
  //         this.showImage(div)
  //       })
  //   }
  // }
}
