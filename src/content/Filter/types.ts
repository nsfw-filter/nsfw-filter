type customType = {
  _isChecked: boolean
  _fullRawImageTimer?: number
  _fullRawImageCounter?: number
}

export type _Image = HTMLImageElement & customType
export type _Video = HTMLVideoElement & customType
