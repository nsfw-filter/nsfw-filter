import { ILogger } from '../../utils/Logger'
import { PredictionRequest, PredictionResponse } from '../../utils/messages'

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

  protected async requestToAnalyzeImage (request: PredictionRequest): Promise<PredictionResponse> {
    return await new Promise((resolve, reject) => {
      try {
        this._requestToAnalyzeImage(request, resolve)
      } catch {
        reject(request)
      }
    })
  }

  private _requestToAnalyzeImage (request: PredictionRequest, resolve: (value: PredictionResponse) => void): void {
    chrome.runtime.sendMessage(request, (response: PredictionResponse) => {
      if (chrome.runtime.lastError !== null && chrome.runtime.lastError !== undefined) {
        this._handleBackgroundErrors(request, resolve, chrome.runtime.lastError.message)
        return
      }

      this.logger.log(response.message)
      resolve(response)
    })
  }

  private _handleBackgroundErrors (request: PredictionRequest, resolve: (value: PredictionResponse) => void, message: string | undefined): void {
    const reconnectCount = request.clearTimer()
    this.logger.log(`Cannot connect to background worker for ${request.url} image, attempt ${reconnectCount}, error: ${message}`)

    if (reconnectCount > 15) {
      resolve(new PredictionResponse(false, request.url, 'Background worker doesn\'t working'))
      this.logger.log(`Background worker is down, marked as visible ${request.url}`)
    } else {
      request.reconectTimer = window.setTimeout(() => this._requestToAnalyzeImage(request, resolve), 100)
    }
  }

  static prepareUrl = (string: string): string | undefined => {
    try {
      const url: URL = new URL(string)
      return (url.protocol === 'http:' || url.protocol === 'https:') ? string : undefined
    } catch {
      const FIRST_SLASH_REGEX = /^\/.*$/
      return FIRST_SLASH_REGEX.test(string) ? `${window.location.origin}${string}` : undefined
    }
  }
}
