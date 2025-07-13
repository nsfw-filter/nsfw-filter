import { NSFWJS, predictionType } from 'nsfwjs'

import { ILogger } from '../utils/Logger'

export type ModelSettings = {
  filterStrictness: number
  modelType?: 'MobileNetV2' | 'MobileNetV2Mid' | 'InceptionV3'
  topKPredictions?: number
  showProbability?: boolean
}

type IModel = {
  predictImage: (image: HTMLImageElement, url: string) => Promise<boolean>
  setSettings: (settings: ModelSettings) => void
}

export class Model implements IModel {
  private readonly model: NSFWJS
  private readonly logger: ILogger

  private readonly FILTER_LIST: Set<string>
  private readonly firstFilterPercentages: Map<string, number>
  private readonly secondFilterPercentages: Map<string, number>
  private topKPredictions: number
  private showProbability: boolean

  constructor (model: NSFWJS, logger: ILogger, settings: ModelSettings) {
    this.model = model
    this.logger = logger

    this.logger.log('Model is loaded')

    this.FILTER_LIST = new Set(['Hentai', 'Porn', 'Sexy'])

    this.firstFilterPercentages = new Map()
    this.secondFilterPercentages = new Map()
    this.topKPredictions = settings.topKPredictions || 5
    this.showProbability = settings.showProbability || false

    this.setSettings(settings)
  }

  public setSettings (settings: ModelSettings): void {
    const { filterStrictness, modelType, topKPredictions, showProbability } = settings
    this.firstFilterPercentages.clear()
    this.secondFilterPercentages.clear()

    // Update additional settings
    if (topKPredictions !== undefined) {
      this.topKPredictions = topKPredictions
    }
    if (showProbability !== undefined) {
      this.showProbability = showProbability
    }

    // Log the model type change if provided
    if (modelType) {
      this.logger.log(`Model type is set to: ${modelType}`)
    }

    for (const className of this.FILTER_LIST.values()) {
      this.firstFilterPercentages.set(
        className,
        Model.handleFilterStrictness({
          value: filterStrictness,
          maxValue: 100,
          minValue: className === 'Porn' ? 40 : 60
        })
      )
    }

    for (const className of this.FILTER_LIST.values()) {
      this.secondFilterPercentages.set(
        className,
        Model.handleFilterStrictness({
          value: filterStrictness,
          maxValue: 50,
          minValue: className === 'Porn' ? 15 : 25
        })
      )
    }
  }

  public async predictImage (image: HTMLImageElement, url: string): Promise<boolean> {
    if (this.logger.status) {
      const start = new Date().getTime()

      // Get predictions based on user setting
      const prediction = await this.model.classify(image, this.topKPredictions)
      const { result, className, probability } = this.handlePrediction(prediction)

      const end = new Date().getTime()
      
      // Enhanced logging with all prediction scores
      const allScores = prediction.map(p => `${p.className}: ${(p.probability * 100).toFixed(1)}%`).join(', ')
      this.logger.log(`IMG prediction (${end - start} ms) - Result: ${result ? 'BLOCKED' : 'ALLOWED'} | Top: ${className} ${(probability * 100).toFixed(1)}% | All scores: [${allScores}] | ${url}`)

      return result
    } else {
      const prediction = await this.model.classify(image, this.topKPredictions)
      return this.handlePrediction(prediction).result
    }
  }

  private handlePrediction (prediction: predictionType[]): { result: boolean, className: string, probability: number } {
    // Use all 5 predictions for better analysis
    const [{ className: cn1, probability: pb1 }, { className: cn2, probability: pb2 }] = prediction

    const result1 = this.FILTER_LIST.has(cn1) && pb1 > (this.firstFilterPercentages.get(cn1) as number)
    if (result1) return ({ result: result1, className: cn1, probability: pb1 })

    const result2 = this.FILTER_LIST.has(cn2) && pb2 > (this.secondFilterPercentages.get(cn2) as number)
    if (result2) return ({ result: result2, className: cn2, probability: pb2 })

    return ({ result: false, className: cn1, probability: pb1 })
  }

  public static handleFilterStrictness ({ value, minValue, maxValue }: {value: number, minValue: number, maxValue: number}): number {
    const MIN = minValue
    const MAX = maxValue

    const calc = (value: number): number => {
      if (value <= 1) return MAX
      else if (value >= 100) return MIN
      else {
        const coefficient = 1 - (value / 100)
        return (coefficient * (MAX - MIN)) + MIN
      }
    }

    return Math.round((calc(value) / 100) * 10000) / 10000
  }
}
