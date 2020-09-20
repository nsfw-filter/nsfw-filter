type PerformanceMemory = {
  readonly memory: {
    jsHeapSizeLimit: number
    totalJSHeapSize: number
    usedJSHeapSize: number
  }
}

export type _Performance = Performance & PerformanceMemory

type customType = {
  _isChecked: boolean
  _fullRawImageTimer?: number
  _fullRawImageCounter?: number
}

export type _HTMLImageElement = HTMLImageElement & customType
export type _HTMLVideoElement = HTMLVideoElement & customType
