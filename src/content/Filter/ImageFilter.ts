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

    // Images laid out smaller than MIN_IMAGE_SIZE in either dimension aren't
    // filtered (icons, spacers, and the like), but they still need a status tag
    // so the pending-hide stylesheet reveals them. A zero width or height means
    // "not laid out yet", which is still a candidate.
    const tooSmall =
      image.width !== 0 && image.height !== 0 &&
      (image.width <= this.MIN_IMAGE_SIZE || image.height <= this.MIN_IMAGE_SIZE)
    if (tooSmall) {
      // Small images aren't filtered, but they still need a status so the
      // pending-hide stylesheet reveals them. Reveal when untagged or when the
      // src changed to a small icon mid-processing: the in-flight result is for
      // the old src, so showImage's url guard would skip it and leave the image
      // stuck hidden. A blocked (nsfw) image stays blocked.
      const status = image.dataset.nsfwFilterStatus
      if (status === undefined || status === 'processing') {
        image.dataset.nsfwFilterStatus = 'sfw'
        if (image.parentNode?.nodeName === 'BODY') image.hidden = false
        image.style.visibility = 'visible'
      }
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
