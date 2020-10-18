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
  private readonly LOADING_TIMEOUT: number
  private readonly firstFilterPercentages: Map<string, number>
  private readonly secondFilterPercentages: Map<string, number>

  constructor (model: NSFWJS, logger: ILogger, settings: ModelSettings) {
    this.model = model
    this.logger = logger
    this.settings = settings

    this.logger.log('Model is loaded')

    this.IMAGE_SIZE = 224
    this.LRUCache = new LRUCache(200)
    this.FILTER_LIST = new Set(['Hentai', 'Porn', 'Sexy'])
    this.LOADING_TIMEOUT = 1000

    this.firstFilterPercentages = new Map()
    this.secondFilterPercentages = new Map()

    this.setSettings(settings)
  }

  public setSettings (settings: ModelSettings): void {
    this.settings = settings
    this.firstFilterPercentages.clear()
    this.secondFilterPercentages.clear()

    for (const className of this.FILTER_LIST.values()) {
      this.firstFilterPercentages.set(
        className,
        Model.handleFilterStrictness({
          value: this.settings.filterStrictness,
          maxValue: 98,
          minValue: className === 'Porn' ? 33 : 45
        })
      )
    }

    for (const className of this.FILTER_LIST.values()) {
      this.secondFilterPercentages.set(
        className,
        Model.handleFilterStrictness({
          value: this.settings.filterStrictness,
          maxValue: 50,
          minValue: className === 'Porn' ? 12 : 20
        })
      )
    }
  }

  public getCache (): LRUCache<string, boolean> {
    return this.LRUCache
  }

  public async predictImage (url: string): Promise<boolean> {
    if (this.LRUCache.has(url)) return this.LRUCache.get(url) as boolean

    const image: HTMLImageElement = await this.loadImage(url)

    const prediction = await this.model.classify(image, 2)
    const { result, className, probability } = this.handlePrediction(prediction)

    this.logger.log(`IMG prediction is ${className} ${probability} for ${url}`)
    this.LRUCache.set(url, result)
    return result
  }

  private async loadImage (url: string): Promise<HTMLImageElement> {
    const image: HTMLImageElement = new Image(this.IMAGE_SIZE, this.IMAGE_SIZE)

    return await new Promise((resolve, reject) => {
      setTimeout(reject, this.LOADING_TIMEOUT, new Error(`Image load timeout ${url}`))
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = (err) => reject(err)
      image.src = url
    })
  }

  private handlePrediction (prediction: predictionType[]): { result: boolean, className: string, probability: number } {
    const [{ className: cn1, probability: pb1 }, { className: cn2, probability: pb2 }] = prediction

    const result1 = this.FILTER_LIST.has(cn1) && pb1 > (this.firstFilterPercentages.get(cn1) as number)
    if (result1) return ({ result: result1, className: cn1, probability: pb1 })

    const result2 = this.FILTER_LIST.has(cn2) && pb2 > (this.secondFilterPercentages.get(cn2) as number)
    if (result2) return ({ result: result2, className: cn2, probability: pb2 })

    return ({ result: result1, className: cn1, probability: pb1 })
  }

  public static handleFilterStrictness ({ value, minValue, maxValue }: {value: number, minValue: number, maxValue: number}): number {
    const MIN = minValue
    const MAX = maxValue

    const calc = (value: number): number => {
      if (value === 1) return MAX
      else if (value === 100) return MIN
      else {
        const coefficient = 1 - (value / 100)
        return (coefficient * (MAX - MIN)) + MIN
      }
    }

    return Math.round((calc(value) / 100) * 10000) / 10000
  }
}
