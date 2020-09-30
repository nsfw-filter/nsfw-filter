import { _Image } from './types'
import { Filter } from './Filter'
import { PredictionRequest } from '../../utils/messages'
import { ILogger } from 'utils/Logger'

export type IImageFilter = {
  analyzeImage: (image: _Image, srcAttribute: boolean) => void
  // analyzeDiv: (div: _Image) => void
}

export class ImageFilter extends Filter implements IImageFilter {
  private readonly MIN_IMAGE_SIZE: number

  constructor (_logger: ILogger) {
    super(_logger)
    this.MIN_IMAGE_SIZE = 41
  }

  public analyzeImage (image: _Image, srcAttribute: boolean = false): void {
    if (image.src.length > 0) {
      if (srcAttribute) {
        this._analyzeImage(image)
      } else if (
        image._isChecked === undefined &&
        ((image.width > this.MIN_IMAGE_SIZE && image.height > this.MIN_IMAGE_SIZE) || image.height === 0 || image.width === 0)
      ) {
        this._analyzeImage(image)
      }
    }
  }

  private _analyzeImage (image: _Image): void {
    image._isChecked = true
    this.hideImage(image)
    this.logger.log(`Analyze image ${image.src}`)

    const request = new PredictionRequest(image.src)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (result) {
          this.blockedItems++
        } else {
          this.showImage(image, url)
        }
      }).catch(({ url }) => {
        this.showImage(image, url)
      })
  }

  private hideImage (image: _Image): void {
    image.style.visibility = 'hidden'
    if (image.parentNode?.nodeName === 'BODY') image.hidden = true
  }

  private showImage (image: _Image, url: string): void {
    if (image.src === url) {
      image.style.visibility = 'visible'
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false
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
