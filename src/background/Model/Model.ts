import { NSFWJS, predictionType } from '@nsfw-filter/nsfwjs'

import { ILogger } from '../../utils/Logger'

import { LRUCache } from './LRUCache'

export type ModelSettings = {
  filterStrictness: number
}

type IModel = {
  predictImage: (url: string) => Promise<boolean>
  getCache: () => LRUCache<string, boolean>
  setSettings: (settings: ModelSettings) => void
}

export class Model implements IModel {
  private readonly model: NSFWJS
  private readonly logger: ILogger
  private settings: ModelSettings

  private readonly IMAGE_SIZE: number
  private readonly LRUCache: LRUCache<string, boolean>
  private readonly FILTER_LIST: Set<string>

  constructor (model: NSFWJS, logger: ILogger, settings: ModelSettings) {
    this.model = model
    this.logger = logger
    this.settings = settings

    this.logger.log('Model is loaded')

    this.IMAGE_SIZE = 224
    this.LRUCache = new LRUCache(200)
    this.FILTER_LIST = new Set(['Hentai', 'Porn', 'Sexy'])
  }

  public setSettings (settings: ModelSettings): void {
    this.settings = settings
  }

  public getCache (): LRUCache<string, boolean> {
    return this.LRUCache
  }

  public async predictImage (url: string): Promise<boolean> {
    if (this.LRUCache.has(url)) return this.LRUCache.get(url) as boolean

    const image: HTMLImageElement = await this.loadImage(url)

    const prediction = await this.model.classify(image, 1)
    const { result, className, probability } = this.handlePredictions([prediction])

    this.logger.log(`IMG prediction is ${className} ${probability} for ${url}`)
    this.LRUCache.set(url, result)
    return result
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

    const prediction = flattenArr.find(({ className, probability }) => this.FILTER_LIST.has(className) && probability > 0.5)

    if (prediction !== undefined) return ({ result: true, ...prediction })

    return ({ result: false, className: flattenArr[0].className, probability: flattenArr[0].probability })
  }
}
