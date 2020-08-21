import { requestType, responseType, _HTMLImageElement as _Image } from '../../utils/types'
import { logger } from '../../utils/Logger'

const notEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined
}

export type IImageFilter = {
  analyzeImage: (image: _Image) => void
  analyzeImageByUrl: (url: string) => Promise<boolean>
  getBlockAmount: () => number
}

export class ImageFilter implements IImageFilter {
  private _blockedItems: number

  constructor () {
    this._blockedItems = 0
  }

  public analyzeImage (image: _Image): void {
    // Skip small images, but pass pending
    if ((image.width > 32 && image.height > 32) || image.width === 0 || image.height === 0) {
      if (image._isChecked === undefined && image.src.length > 0) {
        image._isChecked = true
        logger.log(`Analyze image ${image.src}`)
        image.style.visibility = 'hidden'
        setTimeout(() => this._analyzeImage(image), 0)
      }
    }
  }

  public async analyzeImageByUrl (url: string): Promise<boolean> {
    const request: requestType = { url }

    return await new Promise((resolve) => {
      chrome.runtime.sendMessage(request, (response: responseType) => {
        // @TODO handle errors
        if (chrome.runtime.lastError != null) {
          resolve(false)
        }

        logger.log(response.message)
        if (!response.result) {
          return resolve(false)
        } else {
          return resolve(true)
        }
      })
    })
  }

  public getBlockAmount (): number {
    return this._blockedItems
  }

  private _analyzeImage (image: _Image): void {
    // For google images case, where raw image has invalid url with slashes
    if (Array.isArray(image.src.match(/\/\/\/\/\//))) {
      this.handleInvalidRawDate(image)
      return
    }

    const request: requestType = ImageFilter.buildRequest(image)
    chrome.runtime.sendMessage(request, (response: responseType) => this.handleReponse(response, image))
  }

  private handleInvalidRawDate (image: _Image): void {
    image._fullRawImageCounter = image._fullRawImageCounter ?? 0
    logger.log(`Invalid raw image ${image.src}, attempt ${image._fullRawImageCounter}`)
    image._fullRawImageCounter++
    clearTimeout(image._fullRawImageTimer)

    if (image._fullRawImageCounter > 77) {
      image.style.visibility = 'visible'
      logger.log(`Invalid raw image, marked as visible ${image.src}`)
    } else {
      image._fullRawImageTimer = window.setTimeout(() => this._analyzeImage(image), 100)
    }
  }

  private handleReponse (response: responseType, image: _Image): void {
    if (chrome.runtime.lastError != null) {
      this.handleBackgroundErrors(image, chrome.runtime.lastError.message)
      return
    }

    logger.log(response.message)
    if (!response.result) {
      image.style.visibility = 'visible'
    } else {
      this._blockedItems = this._blockedItems + 1
    }
  }

  private handleBackgroundErrors (image: _Image, message: string | undefined): void {
    image._reconectCount = image._reconectCount ?? 0
    logger.log(`Cannot connect to background worker for ${image.src} image, attempt ${image._reconectCount}, error: ${message}`)
    image._reconectCount++
    clearTimeout(image._reconectTimer)

    if (image._reconectCount > 15) {
      image.style.visibility = 'visible'
      logger.log(`Background worker is down, marked as visible ${image.src}`)
    } else {
      image._reconectTimer = window.setTimeout(() => this._analyzeImage(image), 100)
    }
  }

  private static buildRequest (image: _Image): requestType {
    const message: requestType = { url: image.src }
    if (Object.values(image.dataset).length > 0) {
      message.lazyUrls = Object.values(image.dataset).map(url => {
        if (typeof url === 'string' && url.length > 5) {
          return ImageFilter.isValidHttpUrl(url) ? url : `${window.location.origin}${url}`
        }
      }).filter(notEmpty)
    }

    return message
  }

  private static isValidHttpUrl (string: string): boolean {
    try {
      const url: URL = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }
}
