/* eslint-disable @typescript-eslint/consistent-type-definitions */

// import { NSFWJS } from 'nsfw-filter-nsfwjs'
import { NSFWJS } from 'nsfw-filter-nsfwjs'
import { FILTER_LIST } from '../utils/common'
import { responseType } from '../utils/types'

interface IModel {
  predictImage: (url: string) => Promise<boolean>
}

export class Model implements IModel {
  private readonly model: NSFWJS
  private readonly GIF_REGEX: RegExp

  constructor (model: NSFWJS) {
    this.model = model
    this.GIF_REGEX = /^.*(.gif)($|\W.*$)/
  }

  private async loadImage (url: string): Promise<HTMLImageElement> {
    const image: HTMLImageElement = new Image()

    return await new Promise((resolve, reject) => {
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = (err) => reject(err)
      image.src = url
    })
  }

  public async predictImage (url: string): Promise<boolean> {
    const image = await this.loadImage(url)

    const prediction = await this.model.classify(image, 3)
    const result: Boolean = prediction.length > 0 && FILTER_LIST.includes(prediction[0].className)
    if (result === true) return Boolean(result)

    if (this.GIF_REGEX.test(url)) {
      const predictionGIF = await this.model.classifyGif(image, { topk: 3, fps: 1.5 })
      const resultGIF = predictionGIF.find(array => FILTER_LIST.includes(array[0].className))
      return Boolean(resultGIF)
    }

    return Boolean(result)
  }

  public static buildMsg (result: boolean, url: string, error?: string): responseType {
    const message = typeof error === 'string' && error.length > 0
      ? `Prediction result is ${result} for image ${url}, error: ${error}`
      : `Prediction result is ${result} for image ${url}`

    return { result, message }
  }
}
