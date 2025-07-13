import { NSFWJS, predictionType } from 'nsfwjs'

import { ILogger } from '../utils/Logger'

export type ModelSettings = {
  filterStrictness: number  // Keep for backward compatibility
  modelType?: 'MobileNetV2' | 'MobileNetV2Mid' | 'InceptionV3'
  topKPredictions?: number
  showProbabilityOverlay?: boolean
  classThresholds?: { [className: string]: number }
}

type IModel = {
  predictImage: (image: HTMLImageElement, url: string) => Promise<boolean>
  predictImageWithScores: (image: HTMLImageElement, url: string) => Promise<{ result: boolean, predictions: Array<{ className: string, probability: number }> }>
  setSettings: (settings: ModelSettings) => void
}

export class Model implements IModel {
  private readonly model: NSFWJS
  private readonly logger: ILogger

  private readonly FILTER_LIST: Set<string>
  private readonly firstFilterPercentages: Map<string, number>
  private readonly secondFilterPercentages: Map<string, number>
  private topKPredictions: number
  private showProbabilityOverlay: boolean
  private classThresholds: { [className: string]: number }

  constructor (model: NSFWJS, logger: ILogger, settings: ModelSettings) {
    this.model = model
    this.logger = logger

    this.logger.log('Model is loaded')

    this.FILTER_LIST = new Set(['Hentai', 'Porn', 'Sexy'])

    this.firstFilterPercentages = new Map()
    this.secondFilterPercentages = new Map()
    this.topKPredictions = settings.topKPredictions || 5
    this.showProbabilityOverlay = settings.showProbabilityOverlay || false
    this.classThresholds = settings.classThresholds || {
      'Hentai': 0.6,
      'Porn': 0.4,
      'Sexy': 0.6,
      'Drawing': 0.8,
      'Neutral': 0.9
    }

    this.setSettings(settings)
  }

  public setSettings (settings: ModelSettings): void {
    const { filterStrictness, modelType, topKPredictions, showProbabilityOverlay, classThresholds } = settings
    this.firstFilterPercentages.clear()
    this.secondFilterPercentages.clear()

    // Update additional settings
    if (topKPredictions !== undefined) {
      this.topKPredictions = topKPredictions
    }
    if (showProbabilityOverlay !== undefined) {
      this.showProbabilityOverlay = showProbabilityOverlay
    }
    if (classThresholds !== undefined) {
      this.classThresholds = classThresholds
    }

    // Log the model type change if provided
    if (modelType) {
      this.logger.log(`Model type is set to: ${modelType}`)
    }

    // Use the new per-class thresholds instead of the old filter strictness logic
    for (const className of this.FILTER_LIST.values()) {
      const threshold = this.classThresholds[className] || 0.5
      this.firstFilterPercentages.set(className, threshold)
      this.secondFilterPercentages.set(className, threshold * 0.5) // Secondary threshold is half
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

  public async predictImageWithScores (image: HTMLImageElement, url: string): Promise<{ result: boolean, predictions: Array<{ className: string, probability: number }> }> {
    const start = new Date().getTime()

    // Get predictions based on user setting
    const prediction = await this.model.classify(image, this.topKPredictions)
    const { result, className, probability } = this.handlePrediction(prediction)

    const end = new Date().getTime()
    
    // Enhanced logging with all prediction scores
    if (this.logger.status) {
      const allScores = prediction.map(p => `${p.className}: ${(p.probability * 100).toFixed(1)}%`).join(', ')
      this.logger.log(`IMG prediction (${end - start} ms) - Result: ${result ? 'BLOCKED' : 'ALLOWED'} | Top: ${className} ${(probability * 100).toFixed(1)}% | All scores: [${allScores}] | ${url}`)
    }

    return {
      result,
      predictions: prediction.map(p => ({ className: p.className, probability: p.probability }))
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
