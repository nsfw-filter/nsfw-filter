export class PredictionRequest {
  public readonly url: string
  public reconectTimer?: number
  private _reconectCount: number

  constructor (url: string) {
    this.url = url
    this._reconectCount = 0
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
  public readonly url: string

  constructor (result: boolean, url: string, error?: string) {
    const message = typeof error === 'string' && error.length > 0
      ? `Prediction result is ${result} for image ${url}, error: ${error}`
      : `Prediction result is ${result} for image ${url}`

    this.url = url
    this.result = result
    this.message = message
  }
}
