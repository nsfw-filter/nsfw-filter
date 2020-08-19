import { _HTMLVideoElement as Video } from '../../utils/types'
import { ImageFilter, IImageFilter } from './ImageFilter'

type IVideoFilter = {
  analyzeVideo: (video: Video) => void
  getBlockAmount: () => number
}

export class VideoFilter implements IVideoFilter {
  private _blockedItems: number
  private readonly _imageFilter: IImageFilter

  constructor () {
    this._blockedItems = 0
    this._imageFilter = new ImageFilter()
  }

  public analyzeVideo (video: Video): void {
    if (!video._isChecked !== undefined) {
      video.style.visibility = 'hidden'
      video.pause()
      video._isChecked = true
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this._analyzeVideo(video)
    }
  }

  public getBlockAmount (): number {
    return this._blockedItems
  }

  private async _analyzeVideo (video: Video): Promise<void> {
    console.log('Analyze video')
    const posterResult = await this._checkPoster(video)
    console.log({ posterResult })

    if (!posterResult) {
      video.style.visibility = 'visible'
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      video.play()
    } else {
      this._blockedItems = this._blockedItems + 1
    }
  }

  private async _checkPoster (video: Video): Promise<boolean> {
    const url = video.poster
    return await this._imageFilter.analyzeImageByUrl(url)
  }
}
