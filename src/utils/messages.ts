export class PredictionRequest {
  public readonly url: string
  public readonly type?: string // @DOCS Chrome internal usage
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

// Messages exchanged between the service worker and the offscreen document.
// The offscreen document hosts TensorFlow.js + the DOM image loading that a
// Manifest V3 service worker cannot do itself.
export type OffscreenClassifyRequest = {
  target: 'offscreen'
  type: 'CLASSIFY'
  url: string
}

export type OffscreenSettingsRequest = {
  target: 'offscreen'
  type: 'SET_SETTINGS'
  filterStrictness: number
  logging: boolean
}

export type OffscreenRequest = OffscreenClassifyRequest | OffscreenSettingsRequest

export type OffscreenClassifyResponse = {
  result: boolean
  error?: string
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
