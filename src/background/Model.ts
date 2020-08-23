import { NSFWJS } from 'nsfw-filter-nsfwjs'
import { responseType } from '../utils/types'
import { ILogger } from '../utils/Logger'

type IModel = {
  predictImage: (url: string) => Promise<boolean>
}

export class Model implements IModel {
  private readonly model: NSFWJS
  private readonly GIF_REGEX: RegExp
  private readonly FILTER_LIST: string[]
  private readonly IMAGE_SIZE: number
  private readonly logger: ILogger

  constructor (model: NSFWJS, logger: ILogger) {
    this.model = model
    this.logger = logger
    this.GIF_REGEX = /^.*(.gif)($|\W.*$)/
    this.FILTER_LIST = ['Hentai', 'Porn', 'Sexy']
    this.IMAGE_SIZE = 224

    this.logger.log('Model is loaded')
  }

  private async loadImage (url: string): Promise<HTMLImageElement> {
    const image: HTMLImageElement = new Image(this.IMAGE_SIZE, this.IMAGE_SIZE)

    return await new Promise((resolve, reject) => {
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = (err) => reject(err)
      image.src = url
    })
  }

  public async predictImage (url: string): Promise<boolean> {
    const image = await this.loadImage(url)

    const prediction = await this.model.classify(image, 1)
    const result: Boolean = prediction.length > 0 && this.FILTER_LIST.includes(prediction[0].className)
    if (result === true) {
      this.logger.log(`IMG prediction for ${url} is ${prediction[0].className} ${prediction[0].probability}`)
      return Boolean(result)
    }

    if (this.GIF_REGEX.test(url)) {
      const predictionGIF = await this.model.classifyGif(image, { topk: 1, fps: 0.1 })
      const resultGIF = predictionGIF.find(array => this.FILTER_LIST.includes(array[0].className))
      return Boolean(resultGIF)
    }

    this.logger.log(`IMG prediction for ${url} is ${prediction[0].className} ${prediction[0].probability}`)
    return Boolean(result)
  }

  public static buildMsg (result: boolean, url: string, error?: string): responseType {
    const message = typeof error === 'string' && error.length > 0
      ? `Prediction result is ${result} for image ${url}, error: ${error}`
      : `Prediction result is ${result} for image ${url}`

    return { result, message }
  }
}
