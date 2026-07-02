import { load as loadModel, NSFWJS } from 'nsfwjs/core'

import { Model } from '../../background/Model'
import { ILogger } from '../../utils/Logger'
import { TrainedModel } from '../../utils/models'
import { withTimeout } from '../../utils/withTimeout'

import { Classifier, ClassifierSettings, WARMUP_TIMEOUT } from './Classifier'

// The original gantman/nsfwjs MobileNetV2 graph model: 5 classes, 224x224. The
// strictness slider tunes per-class thresholds; that decision logic stays in
// Model.ts exactly as it was, so this model behaves identically to before the
// switcher existed.
const MODEL_PATH = '../models/'
const IMAGE_SIZE = 224

export class NsfwjsClassifier implements Classifier {
  public readonly trainedModel: TrainedModel = 'MobileNet_v1.2'

  private readonly logger: ILogger
  private settings: ClassifierSettings
  private nsfw: NSFWJS | null = null
  private model: Model | null = null

  constructor (logger: ILogger, settings: ClassifierSettings) {
    this.logger = logger
    this.settings = settings
  }

  public async load (requireWarm: boolean): Promise<boolean> {
    this.nsfw = await loadModel(MODEL_PATH, { type: 'graph' })
    const warmed = await this.warmUp()
    if (!warmed && requireWarm) {
      this.dispose()
      return false
    }
    this.model = new Model(this.nsfw, this.logger, this.settings)
    return true
  }

  private async warmUp (): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = IMAGE_SIZE
      canvas.height = IMAGE_SIZE
      await withTimeout((this.nsfw as NSFWJS).classify(canvas, 1), WARMUP_TIMEOUT, 'Model warm-up')
      return true
    } catch (error) {
      this.logger.error(error as Error)
      return false
    }
  }

  public async predict (image: HTMLImageElement, url: string): Promise<boolean> {
    if (this.model === null) throw new Error('Model is not loaded')
    return await this.model.predictImage(image, url)
  }

  public setSettings (settings: ClassifierSettings): void {
    this.settings = settings
    this.model?.setSettings(settings)
  }

  public dispose (): void {
    this.model = null
    this.nsfw?.dispose()
    this.nsfw = null
  }
}
