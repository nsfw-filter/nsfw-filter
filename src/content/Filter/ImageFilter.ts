import { requestType, _HTMLImageElement as _Image } from '../../utils/types'
import { Filter } from './Filter'

const notEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined
}

export type IImageFilter = {
  analyzeImage: (image: _Image) => void
  analyzeDiv: (div: _Image) => void
}

export class ImageFilter extends Filter implements IImageFilter {
  public analyzeImage (image: _Image): void {
    // Skip small images, but pass pending
    if ((image.width > 32 && image.height > 32) || image.width === 0 || image.height === 0) {
      if (image._isChecked === undefined && image.src.length > 0) {
        image._isChecked = true
        this.hideImage(image)
        this.logger.log(`Analyze image ${image.src}`)
        this._analyzeImage(image)
      }
    }
  }

  public async analyzeDiv (div: _Image): Promise<void> {
    if (div._isChecked === undefined && typeof div.style.backgroundImage === 'string' && div.style.backgroundImage.length > 0) {
      div._isChecked = true
      this.hideImage(div)

      const url: string | undefined = ImageFilter.prepareUrl(div.style.backgroundImage.slice(5, -2))
      if (url === undefined) return

      this.requestToAnalyzeImage({ url })
        .then(result => {
          if (result) {
            this.blockedItems++
          } else {
            this.showImage(div)
          }
        }).catch(_error => {
          this.showImage(div)
        })
    }
  }

  private _analyzeImage (image: _Image): void {
    // For google images case, where raw image has invalid url with slashes
    if (Array.isArray(image.src.match(/\/\/\//))) {
      this.handleInvalidRawDate(image)
      return
    }

    const request: requestType = ImageFilter.buildRequest(image)
    this.requestToAnalyzeImage(request)
      .then(result => {
        if (result) {
          this.blockedItems++
        } else {
          this.showImage(image)
        }
      }).catch(_error => {
        this.showImage(image)
      })
  }

  private handleInvalidRawDate (image: _Image): void {
    image._fullRawImageCounter = image._fullRawImageCounter ?? 0
    this.logger.log(`Invalid raw image ${image.src}, attempt ${image._fullRawImageCounter}`)
    image._fullRawImageCounter++
    clearTimeout(image._fullRawImageTimer)

    if (image._fullRawImageCounter < 77) {
      image._fullRawImageTimer = window.setTimeout(() => this._analyzeImage(image), 100)
      return
    }

    this.showImage(image)
    this.logger.log(`Invalid raw image, marked as visible ${image.src}`)
  }

  private static buildRequest (image: _Image): requestType {
    const message: requestType = { url: image.src }

    if (Object.values(image.dataset).length > 0) {
      message.lazyUrls = Object.values(image.dataset).map(url => {
        if (typeof url === 'string') return ImageFilter.prepareUrl(url)
      }).filter(notEmpty)
    }

    return message
  }

  private hideImage (image: _Image): void {
    image.style.visibility = 'hidden'

    if (image.parentNode?.nodeName === 'BODY') image.hidden = true
  }

  private showImage (image: _Image): void {
    image.style.visibility = 'visible'

    if (image.parentNode?.nodeName === 'BODY') image.hidden = false
  }
}
