import { requestType, responseType, _HTMLImageElement as _Image } from '../../utils/types'

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
    if (!image._isChecked && image.src.length > 0) {
      console.log(`Analyze image ${image.src}`)
      image.style.visibility = 'hidden'
      this._analyzeImage(image)
      image._isChecked = true
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

        console.log(response.message)
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
    console.log(`Invalid raw image ${image.src}, attempt ${image._fullRawImageCounter}`)
    image._fullRawImageCounter++

    if (image._fullRawImageCounter > 10) {
      image.style.visibility = 'visible'
      console.log(`Invalid raw image, marked as visible ${image.src}`)
    } else {
      clearTimeout(image._fullRawImageTimer)
      image._fullRawImageTimer = window.setTimeout(() => this._analyzeImage(image), 100)
    }
  }

  private handleReponse (response: responseType, image: _Image): void {
    if (chrome.runtime.lastError != null) {
      this.handleBackgroundErrors(image, chrome.runtime.lastError.message)
      return
    }

    console.log(response.message)
    if (!response.result) {
      image.style.visibility = 'visible'
    } else {
      this._blockedItems = this._blockedItems + 1
    }
  }

  private handleBackgroundErrors (image: _Image, message: string | undefined): void {
    image._reconectCount = image._reconectCount ?? 0
    console.log(`Cannot connect to background worker for ${image.src} image, attempt ${image._reconectCount}, error: ${message}`)
    image._reconectCount++

    if (image._reconectCount > 15) {
      image.style.visibility = 'visible'
      console.log(`Background worker is down, marked as visible ${image.src}`)
    } else {
      clearTimeout(image._reconectTimer)
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
