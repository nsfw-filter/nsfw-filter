import { _Video } from './types'
import { Filter } from './Filter'

export type IVideoFilter = {
  analyzeVideo: (video: _Video) => void
}

export class VideoFilter extends Filter implements IVideoFilter {
  public analyzeVideo (video: _Video): void {
    const url = VideoFilter.prepareUrl(video.poster)

    if (video._isChecked === undefined && typeof url === 'string') {
      video._isChecked = true
      this.hideVideo(video)
      this._analyzeVideo(video).then(() => { }, () => { })
    }
  }

  private async _analyzeVideo (video: _Video): Promise<void> {
    // try {
    // const posterResult = await this._checkPoster(video.poster)

    //   if (posterResult) {
    //     this.blockedItems++
    //     return
    //   }

    //   this.showVideo(video)
    // } catch {
    //   this.showVideo(video)
    // }
  }

  private hideVideo (video: _Video): void {
    video.style.visibility = 'hidden'
    video.pause()
  }

  private showVideo (video: _Video): void {
    video.style.visibility = 'visible'
    video.play().then(() => { }, () => { })
  }

  // private async _checkPoster (url: string): Promise<boolean> {
  //   this.logger.log(`Analyze video ${url}`)
  //   const request = new PredictionRequest(url)

  //   return await this.requestToAnalyzeImage(request)
  // }
}
