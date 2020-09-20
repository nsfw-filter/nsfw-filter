import { prepareUrl } from './prepareUrl'

const notEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined
}

export class PredictionRequest {
  public readonly url: string
  public lazyUrls?: string[]
  public reconectTimer?: number
  private _reconectCount: number

  constructor (url: string, dataset?: DOMStringMap) {
    this.url = url
    this._reconectCount = 0

    if (dataset !== undefined && Object.values(dataset).length > 0) {
      const lazyUrls = Object.values(dataset).map(url => {
        if (typeof url === 'string') return prepareUrl(url)
      }).filter(notEmpty)
      this.lazyUrls = lazyUrls
    }
  }

  public addLazyUrls (lazyUrls: string[]): void {
    this.lazyUrls = lazyUrls
  }

  public clearTimer (): number {
    this._reconectCount++
    clearTimeout(this.reconectTimer)
    return this._reconectCount
  }
}

export class PredictionResponse {
  public readonly result: boolean
  public readonly message: string

  constructor (result: boolean, url: string, error?: string) {
    const message = typeof error === 'string' && error.length > 0
      ? `Prediction result is ${result} for image ${url}, error: ${error}`
      : `Prediction result is ${result} for image ${url}`

    this.result = result
    this.message = message
  }
}
