import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide' | 'grayscale'
}

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  analyzeBgImage: (image: HTMLElement, url: string) => void
  setSettings: (settings: imageFilterSettingsType) => void
  revealImage: (image: HTMLImageElement) => void
  checkStyleMutation: (image: HTMLImageElement) => void
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

  // User-initiated unhide from the right-click menu. Clears whatever effect was
  // applied and tags the image `sfw` so analyzeImage won't re-filter it (and a
  // later src change re-triggers analysis as usual).
  public revealImage (image: HTMLImageElement): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = false
    image.style.filter = ''
    image.style.visibility = 'visible'
    image.dataset.nsfwFilterStatus = 'sfw'
  }

  public analyzeImage (image: HTMLImageElement, srcAttribute: boolean = false): void {
    // Only (re)process unseen images or images whose `src` just changed.
    if (!srcAttribute && image.dataset.nsfwFilterStatus !== undefined) return
    if (image.src.length === 0) {
      // An image whose src is cleared while a prediction is in flight would keep
      // its `processing` tag and inline visibility:hidden forever: the pending
      // result is for the old src, so showImage's url guard skips it. Reveal it —
      // an empty image has nothing to filter, and a later real src re-triggers
      // analysis via srcAttribute.
      if (image.dataset.nsfwFilterStatus === 'processing') {
        image.dataset.nsfwFilterStatus = 'sfw'
        if (image.parentNode?.nodeName === 'BODY') image.hidden = false
        image.style.visibility = 'visible'
      }
      return
    }

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

  // Some sites (Instagram, Google) rewrite an image's inline style on every
  // re-render, wiping the effect we applied so a blocked image reappears. When
  // the page clears the effect on a still-blocked image, put it back. The
  // effect-intact check keeps this from looping against our own style writes.
  public checkStyleMutation (image: HTMLImageElement): void {
    const status = image.dataset.nsfwFilterStatus
    // An in-flight image is hidden only by our inline visibility; a restyle wipes
    // it. Keep it hidden (not revealed-with-effect: it isn't classified yet) until
    // the prediction returns and either reveals or blocks it.
    if (status === 'processing') {
      if (image.style.visibility !== 'hidden') this.hideImage(image)
      return
    }
    if (status !== 'nsfw') return
    if (this.isEffectApplied(image)) return
    this.applyEffect(image)
  }

  private isEffectApplied (image: HTMLImageElement): boolean {
    // Match our exact value, not a substring: a site setting its own weak
    // `filter: blur(1px)` on a blocked image must still count as effect-gone so
    // we re-apply the full blur(25px), not leave the image barely obscured.
    if (this.settings.filterEffect === 'blur') return image.style.filter === 'blur(25px)'
    if (this.settings.filterEffect === 'grayscale') return image.style.filter === 'grayscale(1)'
    return image.style.visibility === 'hidden'
  }

  private applyEffect (image: HTMLImageElement): void {
    if (this.settings.filterEffect === 'blur') {
      image.style.filter = 'blur(25px)'
      image.style.visibility = 'visible'
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false
    } else if (this.settings.filterEffect === 'grayscale') {
      image.style.filter = 'grayscale(1)'
      image.style.visibility = 'visible'
      if (image.parentNode?.nodeName === 'BODY') image.hidden = false
    } else {
      image.style.visibility = 'hidden'
      if (image.parentNode?.nodeName === 'BODY') image.hidden = true
    }
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

  public analyzeBgImage (image: HTMLElement, url: string): void {
    this.hideBgImage(image)
    const request = new PredictionRequest(url)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (result) {
          if (this.settings.filterEffect === 'blur') {
            image.style.filter = 'blur(25px)'
            this.showBgImage(image, url)
          }

          this.blockedItems++
          image.dataset.nsfwFilterStatus = 'nsfw'
        } else {
          this.showBgImage(image, url)
        }
      }).catch(({ url }) => {
        this.showBgImage(image, url)
      })
  }

  private hideBgImage (image: HTMLElement): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = true

    image.dataset.nsfwFilterStatus = 'processing'
    image.style.visibility = 'hidden'
  }

  private showBgImage (image: HTMLElement, url: string): void {
    if (image.parentNode?.nodeName === 'BODY') image.hidden = false

    image.dataset.nsfwFilterStatus = 'sfw'
    image.style.visibility = 'visible'
  }
}
