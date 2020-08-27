import { requestType, responseType } from '../../utils/types'
import { ILogger } from '../../utils/Logger'

type IFilter = {
  getBlockAmount: () => number
}

export class Filter implements IFilter {
  protected readonly logger: ILogger
  protected blockedItems: number

  constructor (_logger: ILogger) {
    this.logger = _logger
    this.blockedItems = 0
  }

  public getBlockAmount (): number {
    return this.blockedItems
  }

  protected async requestToAnalyzeImage (request: requestType): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      try {
        this._requestToAnalyzeImage(request, resolve)
      } catch (error) {
        reject(error)
      }
    })
  }

  private _requestToAnalyzeImage (request: requestType, resolve: (value: boolean) => void): void {
    chrome.runtime.sendMessage(request, (response: responseType) => {
      if (chrome.runtime.lastError !== null && chrome.runtime.lastError !== undefined) {
        this._handleBackgroundErrors(request, resolve, chrome.runtime.lastError.message)
        return
      }

      this.logger.log(response.message)
      resolve(response.result)
    })
  }

  private _handleBackgroundErrors (request: requestType, resolve: (value: boolean) => void, message: string | undefined): void {
    request._reconectCount = request._reconectCount ?? 0
    this.logger.log(`Cannot connect to background worker for ${request.url} image, attempt ${request._reconectCount}, error: ${message}`)
    request._reconectCount++
    clearTimeout(request._reconectTimer)

    if (request._reconectCount > 15) {
      resolve(true)
      this.logger.log(`Background worker is down, marked as visible ${request.url}`)
    } else {
      request._reconectTimer = window.setTimeout(() => this._requestToAnalyzeImage(request, resolve), 100)
    }
  }

  protected static prepareUrl (string: string): string | undefined {
    try {
      const url: URL = new URL(string)
      return (url.protocol === 'http:' || url.protocol === 'https:') ? string : undefined
    } catch {
      const FIRST_SLASH_REGEX = /^\/.*$/
      return FIRST_SLASH_REGEX.test(string) ? `${window.location.origin}${string}` : undefined
    }
  }
}
