import { ILogger } from '../../utils/Logger'
import { PredictionRequest, PredictionResponse } from '../../utils/messages'

type IFilter = {
  getBlockAmount: () => number
}

type FilterRequestQueueValue = Array<Array<{
  resolve: (value: PredictionResponse) => void
  reject: (error: PredictionRequest) => void
}>>

export class Filter implements IFilter {
  protected readonly logger: ILogger
  protected blockedItems: number
  private readonly requestQueue: Map<string, FilterRequestQueueValue>

  constructor (_logger: ILogger) {
    this.logger = _logger
    this.blockedItems = 0
    this.requestQueue = new Map()
  }

  public getBlockAmount (): number {
    return this.blockedItems
  }

  protected async requestToAnalyzeImage (request: PredictionRequest): Promise<PredictionResponse> {
    return await new Promise((resolve, reject) => {
      const queueName = request.url

      try {
        if (this.requestQueue.has(queueName)) {
          this.requestQueue.get(queueName)?.push([{ resolve, reject }])
        } else {
          this.requestQueue.set(queueName, [[{ resolve, reject }]])

          this._requestToAnalyzeImage(request, resolve)
        }
      } catch {
        if (this.requestQueue.has(queueName)) {
          for (const [{ reject }] of this.requestQueue.get(queueName) as FilterRequestQueueValue) {
            reject(request)
          }
        } else {
          reject(request)
        }
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
      for (const [{ resolve }] of this.requestQueue.get(request.url) as FilterRequestQueueValue) {
        resolve(response)
      }
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
