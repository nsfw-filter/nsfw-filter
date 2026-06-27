import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide' | 'grayscale'
}

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  setSettings: (settings: imageFilterSettingsType) => void
}

export class ImageFilter extends Filter implements IImageFilter {
  private readonly MIN_IMAGE_SIZE: number
  private settings: imageFilterSettingsType

  constructor () {
    super()
    this.MIN_IMAGE_SIZE = 41

    this.settings = { filterEffect: 'hide' }
  }

  public setSettings (settings: imageFilterSettingsType): void {
    this.settings = settings
  }

  public analyzeImage (image: HTMLImageElement, srcAttribute: boolean = false): void {
    // Only (re)process unseen images or images whose `src` just changed.
    if (!srcAttribute && image.dataset.nsfwFilterStatus !== undefined) return
    if (image.src.length === 0) return

    // Images that are laid out and smaller than MIN_IMAGE_SIZE in either
    // dimension are not filtered (icons, spacers, etc.). They still need a status
    // tag so the content script's pending-hide stylesheet reveals them instead of
    // leaving them invisible. A zero width/height means "not laid out yet", which
    // is still a filtering candidate.
    const tooSmall =
      image.width !== 0 && image.height !== 0 &&
      (image.width <= this.MIN_IMAGE_SIZE || image.height <= this.MIN_IMAGE_SIZE)
    if (tooSmall) {
      if (image.dataset.nsfwFilterStatus === undefined) image.dataset.nsfwFilterStatus = 'sfw'
      return
    }

    image.dataset.nsfwFilterStatus = 'processing'
    this._analyzeImage(image)
  }

  private _analyzeImage (image: HTMLImageElement): void {
    this.hideImage(image)

    const request = new PredictionRequest(image.src)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (result) {
          if (this.settings.filterEffect === 'blur') {
            image.style.filter = 'blur(25px)'
            this.showImage(image, url)
          } else if (this.settings.filterEffect === 'grayscale') {
            image.style.filter = 'grayscale(1)'
            this.showImage(image, url)
          }

          this.blockedItems++
          image.dataset.nsfwFilterStatus = 'nsfw'
        } else {
          this.showImage(image, url)
        }
      }).catch(({ url }) => {
        this.showImage(image, url)
      })
  }

  private hideImage (image: HTMLImageElement): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = true

    image.style.visibility = 'hidden'
  }

  private showImage (image: HTMLImageElement, url: string): void {
    if (image.src === url) {
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false

      image.dataset.nsfwFilterStatus = 'sfw'
      image.style.visibility = 'visible'
    }
  }
}
