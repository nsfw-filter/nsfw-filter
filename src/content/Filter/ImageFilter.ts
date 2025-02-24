import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

type imageFilterSettingsType = {
  filterEffect: 'blur' | 'hide' | 'grayscale' | 'redirect'
}

export type IImageFilter = {
  analyzeImage: (image: HTMLImageElement, srcAttribute: boolean) => void
  analyzeVideo: (video: HTMLVideoElement) => void
  setSettings: (settings: imageFilterSettingsType) => void
  analyzeDiv: (div: HTMLDivElement) => void
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

  public analyzeVideo (video: HTMLVideoElement): void {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (context) {
      const analyzeFrame = () => {
        if (video.readyState >= 2 && video.dataset.nsfwFilterStatus !== 'nsfw') {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const frameData = canvas.toDataURL('image/png')
          const request = new PredictionRequest(frameData)
          this.requestToAnalyzeImage(request)
            .then(({ result }) => {
              if (result) {
                video.pause();
                video.addEventListener("play", function() {
                  video.pause();
                });
                if (this.settings.filterEffect === 'hide') {
                  video.style.visibility = 'hidden'
                }
                else if (this.settings.filterEffect === 'blur') {
                  video.style.filter = 'blur(25px)'
                } else if (this.settings.filterEffect === 'grayscale') {
                  video.style.filter = 'grayscale(1)'
                } else if (this.settings.filterEffect === 'redirect') {
                  window.location.href = 'about:blank'
                }

                this.blockedItems++
                video.dataset.nsfwFilterStatus = 'nsfw'
              } else {
                video.dataset.nsfwFilterStatus = 'sfw'
              }
            })
            .catch(() => {
              video.dataset.nsfwFilterStatus = 'sfw'
            })
        }
      }

      video.addEventListener('loadedmetadata', () => {
        analyzeFrame()
        setInterval(analyzeFrame, 1000)
      }) 
    }
  }

  public analyzeDiv (div: HTMLDivElement): void {
    const backgroundImage = window.getComputedStyle(div).backgroundImage
    if (backgroundImage && backgroundImage !== 'none') {
      const urlMatch = backgroundImage.match(/url\(["']?([^"']*)["']?\)/)
      if (urlMatch && urlMatch[1]) {
        const imageUrl = urlMatch[1]
        const request = new PredictionRequest(imageUrl)
        this.requestToAnalyzeImage(request)
          .then(({ result }) => {
            if (result) {
              if (this.settings.filterEffect === 'hide') {
                div.style.visibility = 'hidden'
              } else if (this.settings.filterEffect === 'blur') {
                div.style.filter = 'blur(25px)'
              } else if (this.settings.filterEffect === 'grayscale') {
                div.style.filter = 'grayscale(1)'
              } else if (this.settings.filterEffect === 'redirect') {
                window.location.href = 'about:blank'
              }

              this.blockedItems++
              div.dataset.nsfwFilterStatus = 'nsfw'
            } else {
              div.dataset.nsfwFilterStatus = 'sfw'
            }
          })
          .catch(() => {
            div.dataset.nsfwFilterStatus = 'sfw'
          })
      }
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
          } else if (this.settings.filterEffect === 'redirect') {
            window.location.href = 'about:blank'
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
