import { _HTMLVideoElement as Video } from '../../utils/types'
import { ImageFilter, IImageFilter } from './ImageFilter'
import { logger } from '../../utils/Logger'

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
    if (video._isChecked === undefined) {
      video._isChecked = true
      video.style.visibility = 'hidden'
      video.pause()
      this._analyzeVideo(video).then(() => {}, () => {})
    }
  }

  public getBlockAmount (): number {
    return this._blockedItems
  }

  private async _analyzeVideo (video: Video): Promise<void> {
    const url = video.poster
    if (typeof url === 'string' && url.length > 5) {
      logger.log(`Analyze video ${url}`)

      const posterResult = await this._checkPoster(url)

      if (!posterResult) {
        video.style.visibility = 'visible'
        video.play().then(() => {}, () => {})
      } else {
        this._blockedItems = this._blockedItems + 1
      }
    } else {
      video.style.visibility = 'visible'
      video.play().then(() => {}, () => {})
    }
  }

  private async _checkPoster (url: string): Promise<boolean> {
    return await this._imageFilter.analyzeImageByUrl(url)
  }
}
