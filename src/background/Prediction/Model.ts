import { NSFWJS, predictionType } from '@nsfw-filter/nsfwjs'
import { ILogger } from '../../utils/Logger'
import { LRUCache } from './LRUCache'

export class Model {
  private readonly model: NSFWJS
  private readonly logger: ILogger

  private readonly IMAGE_SIZE: number
  private readonly LRUCache: LRUCache<string, boolean>
  private readonly FILTER_LIST: Set<string>
  private readonly GIF_REGEX: RegExp

  constructor (model: NSFWJS, logger: ILogger) {
    this.logger = logger
    this.model = model
    this.logger.log('Model is loaded')

    this.IMAGE_SIZE = 224
    this.LRUCache = new LRUCache(200)
    this.FILTER_LIST = new Set(['Hentai', 'Porn', 'Sexy'])
    this.GIF_REGEX = /^.*(.gif)($|\W.*$)/
  }

  protected async predictImage (url: string): Promise<boolean> {
    if (this.LRUCache.has(url)) return this.LRUCache.get(url) as boolean

    const image: HTMLImageElement = await this.loadImage(url)

    const prediction = await this.model.classify(image, 1)
    const { result, className, probability } = this.handlePredictions([prediction])
    if (result) {
      this.logger.log(`IMG prediction for ${url} is ${className} ${probability}`)
      this.LRUCache.set(url, result)
      return result
    } else if (this.GIF_REGEX.test(url)) {
      const predictionGIF = await this.model.classifyGif(image, { topk: 1, fps: 0.1 })
      const { result, className, probability } = this.handlePredictions(predictionGIF)
      this.logger.log(`GIF prediction for ${url} is ${className} ${probability}`)
      this.LRUCache.set(url, result)
      return result
    } else {
      this.logger.log(`IMG prediction for ${url} is ${className} ${probability}`)
      this.LRUCache.set(url, result)
      return result
    }
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

  private handlePredictions (predictions: predictionType[][]): { result: boolean, className: string, probability: number } {
    const flattenArr = predictions.flat()

    const prediction = flattenArr.find(({ className, probability }) => {
      return this.FILTER_LIST.has(className) && probability > 0.5
    })

    if (prediction !== undefined) return ({ result: true, ...prediction })

    return ({ result: false, className: flattenArr[0].className, probability: flattenArr[0].probability })
  }
}
