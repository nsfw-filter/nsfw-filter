import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide' | 'grayscale'
  showProbabilityOverlay?: boolean
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

    this.settings = { filterEffect: 'hide', showProbabilityOverlay: false }
  }

  public setSettings (settings: imageFilterSettingsType): void {
    this.settings = settings
  }

  public analyzeImage (image: HTMLImageElement, srcAttribute: boolean = false): void {
    if (
      (srcAttribute || image.dataset.nsfwFilterStatus === undefined) &&
      image.src.length > 0 &&
      (
        (image.width > this.MIN_IMAGE_SIZE && image.height > this.MIN_IMAGE_SIZE) ||
        image.height === 0 ||
        image.width === 0
      )
    ) {
      image.dataset.nsfwFilterStatus = 'processing'
      this._analyzeImage(image)
    }
  }

  private _analyzeImage (image: HTMLImageElement): void {
    this.hideImage(image)

    const request = new PredictionRequest(image.src)
    this.requestToAnalyzeImage(request)
      .then(({ result, url, predictions }) => {
        // Show overlay if enabled and predictions are available
        if (this.settings.showProbabilityOverlay && predictions) {
          this.showPredictionOverlay(image, predictions)
        }

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

  private showPredictionOverlay (image: HTMLImageElement, predictions: Array<{ className: string, probability: number }>): void {
    // Remove any existing overlay
    this.removePredictionOverlay(image)

    // Create overlay container
    const overlay = document.createElement('div')
    overlay.className = 'nsfw-filter-overlay'
    overlay.style.cssText = `
      position: absolute;
      top: 4px;
      left: 4px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.2;
      z-index: 9999;
      pointer-events: none;
      max-width: 200px;
    `

    // Add prediction scores
    const sortedPredictions = predictions.sort((a, b) => b.probability - a.probability)
    sortedPredictions.forEach((pred, index) => {
      if (index < 3) { // Show top 3 predictions
        const line = document.createElement('div')
        const percentage = (pred.probability * 100).toFixed(1)
        line.textContent = `${pred.className}: ${percentage}%`
        
        // Color code based on NSFW classes
        if (['Hentai', 'Porn', 'Sexy'].includes(pred.className)) {
          line.style.color = pred.probability > 0.5 ? '#ff6b6b' : '#feca57'
        } else if (pred.className === 'Drawing') {
          line.style.color = '#48dbfb'
        } else {
          line.style.color = '#1dd1a1'
        }
        
        overlay.appendChild(line)
      }
    })

    // Position overlay relative to image
    const imageRect = image.getBoundingClientRect()
    if (image.parentElement) {
      image.parentElement.style.position = 'relative'
      image.parentElement.appendChild(overlay)
    }

    // Store reference for cleanup
    image.dataset.nsfwFilterOverlay = 'true'
  }

  private removePredictionOverlay (image: HTMLImageElement): void {
    if (image.dataset.nsfwFilterOverlay && image.parentElement) {
      const existingOverlay = image.parentElement.querySelector('.nsfw-filter-overlay')
      if (existingOverlay) {
        existingOverlay.remove()
      }
      delete image.dataset.nsfwFilterOverlay
    }
  }
}
