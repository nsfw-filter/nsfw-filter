type PerformanceMemory = {
  readonly memory: {
    jsHeapSizeLimit: number
    totalJSHeapSize: number
    usedJSHeapSize: number
  }
}

export type _Performance = Performance & PerformanceMemory

export type requestType = {
  url: string
  lazyUrls?: string[]
  _reconectTimer?: number
  _reconectCount?: number
}

export type responseType = {
  result: boolean
  message: string
}

type customType = {
  _isChecked: boolean
  _fullRawImageTimer?: number
  _fullRawImageCounter?: number
}

export type _HTMLImageElement = HTMLImageElement & customType
export type _HTMLVideoElement = HTMLVideoElement & customType
