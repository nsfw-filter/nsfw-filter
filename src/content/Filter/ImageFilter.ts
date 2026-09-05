import { PredictionRequest } from '../../utils/messages'

import { Filter, FilterSettings } from './Filter'

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  setSettings: (settings: FilterSettings) => void
  revealImage: (image: HTMLImageElement) => void
  checkStyleMutation: (image: HTMLImageElement) => void
  applyEffectToBlocked: () => void
  revealAll: () => void
}

export class ImageFilter extends Filter implements IImageFilter {
  private readonly MIN_IMAGE_SIZE: number
  // Bumped when filtering is turned off. A verdict from before that is for a page
  // the user has since asked us to leave alone.
  private epoch: number
  private readonly unhidden: WeakSet<HTMLImageElement>

  constructor () {
    super()
    this.MIN_IMAGE_SIZE = 41
    this.epoch = 0
    this.unhidden = new WeakSet()
  }

  // User-initiated unhide from the right-click menu. Clears whatever effect was
  // applied and tags the image `sfw` so analyzeImage won't re-filter it (and a
  // later src change re-triggers analysis as usual).
  public revealImage (image: HTMLImageElement): void {
    this.unhidden.add(image)
    this.revealElement(image)
    image.dataset.nsfwFilterStatus = 'sfw'
  }

  public analyzeImage (image: HTMLImageElement, srcAttribute: boolean = false): void {
    // Only (re)process unseen images or images whose `src` just changed.
    if (!srcAttribute && image.dataset.nsfwFilterStatus !== undefined) return
    // A different image in the same element: the unhide the user gave the old one
    // does not carry over.
    if (srcAttribute) this.unhidden.delete(image)
    if (image.src.length === 0) {
      // An image whose src is cleared while a prediction is in flight would keep
      // its `processing` tag and inline visibility:hidden forever: the pending
      // result is for the old src, so showImage's url guard skips it. Reveal it —
      // an empty image has nothing to filter, and a later real src re-triggers
      // analysis via srcAttribute.
      if (image.dataset.nsfwFilterStatus === 'processing') this.revealImage(image)
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
      // Reveal when untagged or when the src changed to a small icon mid-flight:
      // the in-flight result is for the old src, so showImage's url guard would
      // skip it and leave the image stuck hidden. A blocked image stays blocked.
      const status = image.dataset.nsfwFilterStatus
      if (status === undefined || status === 'processing') this.revealImage(image)
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
      if (image.style.visibility !== 'hidden') this.hideElement(image)
      return
    }
    if (status !== 'nsfw') return
    if (this.isEffectApplied(image)) return
    this.applyEffect(image)
  }

  // A live filterEffect change (blur -> grayscale -> hide) doesn't alter the
  // NSFW verdict, only how it's shown, so re-render every already-blocked image
  // from the current setting instead of reclassifying. applyEffect clears the
  // other modes' styles, so switching modes doesn't leave a stale blur behind.
  public applyEffectToBlocked (): void {
    const blocked = document.querySelectorAll<HTMLImageElement>('img[data-nsfw-filter-status="nsfw"]')
    blocked.forEach(image => this.applyEffect(image))
  }

  // Live pause / allow-list of the current page: bring back every image we
  // touched. Clearing the status (not tagging sfw) means a later re-enable's
  // sweep reclassifies them rather than trusting a verdict made while off.
  public revealAll (): void {
    this.epoch++

    const filtered = document.querySelectorAll<HTMLImageElement>('img[data-nsfw-filter-status]')
    filtered.forEach(image => {
      this.revealElement(image)
      delete image.dataset.nsfwFilterStatus
    })
  }

  private _analyzeImage (image: HTMLImageElement): void {
    this.hideElement(image)

    // A verdict applies to the src it was asked about, on a page still being
    // filtered. Filtering can be switched off and the src can change while the
    // request is out, and hiding on a late verdict is not recoverable from.
    const epoch = this.epoch
    const request = new PredictionRequest(image.src)
    this.requestToAnalyzeImage(request)
      .then(({ result, url }) => {
        if (this.epoch !== epoch || image.src !== url || this.unhidden.has(image)) return

        if (result) {
          this.blockedItems++
          image.dataset.nsfwFilterStatus = 'nsfw'
          this.applyEffect(image)
        } else {
          this.showImage(image)
        }
      }).catch(({ url }) => {
        if (this.epoch !== epoch || image.src !== url) return

        this.showImage(image)
      })
  }

  private showImage (image: HTMLImageElement): void {
    image.dataset.nsfwFilterStatus = 'sfw'
    this.revealElement(image)
  }
}
