import {
  browser,
  GraphModel,
  image as tfImage,
  loadGraphModel,
  softmax,
  Tensor,
  tidy
} from '@tensorflow/tfjs'

import { ILogger } from '../../utils/Logger'
import { TrainedModel } from '../../utils/models'
import { withTimeout } from '../../utils/withTimeout'

import { Classifier, ClassifierSettings, WARMUP_TIMEOUT } from './Classifier'

// Marqo/nsfw-image-detection-384 (ViT-Tiny), converted to a TFJS GraphModel.
// Binary: the model outputs two logits and class index 0 is NSFW. onnx2tf
// transposed the graph to NHWC, so the input is [1,384,384,3] — exactly what
// browser.fromPixels produces, no channel/layout juggling needed.
const MODEL_PATH = '../models/marqo/model.json'
const INPUT_SIZE = 384
const NSFW_INDEX = 0

// Marqo's preprocessing: scale to [0,1] then normalize with mean=std=0.5 per
// channel, i.e. (x/255 - 0.5) / 0.5. These MUST match the values printed by the
// export (benchmark/ run), or the model sees inputs it was never trained on.
const NORM_MEAN = 0.5
const NORM_STD = 0.5

// Map the shared 1..100 strictness slider to a single decision threshold on the
// NSFW probability. Same direction as the 5-class model: low slider = lenient
// (high threshold, block only the obvious), high slider = strict (low threshold).
// Endpoints picked so the default (55) lands near the model's own best-F1 point
// (~0.52 from the benchmark); calibrated against the converted weights, not the
// PyTorch numbers, since conversion can shift probabilities slightly.
const LENIENT_THRESHOLD = 0.98
const STRICT_THRESHOLD = 0.15

const strictnessToThreshold = (value: number): number => {
  const clamped = Math.min(100, Math.max(1, value))
  return LENIENT_THRESHOLD + ((clamped - 1) / 99) * (STRICT_THRESHOLD - LENIENT_THRESHOLD)
}

export class BinaryClassifier implements Classifier {
  public readonly trainedModel: TrainedModel = 'ViT_NSFW_384'

  private readonly logger: ILogger
  private model: GraphModel | null = null
  private threshold: number

  constructor (logger: ILogger, settings: ClassifierSettings) {
    this.logger = logger
    this.threshold = strictnessToThreshold(settings.filterStrictness)
  }

  public async load (requireWarm: boolean): Promise<boolean> {
    this.model = await loadGraphModel(MODEL_PATH)
    const warmed = await this.warmUp()
    if (!warmed && requireWarm) {
      this.dispose()
      return false
    }
    return true
  }

  private async warmUp (): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = INPUT_SIZE
      canvas.height = INPUT_SIZE
      const prob = this.nsfwProbability(canvas)
      try {
        await withTimeout(prob.data(), WARMUP_TIMEOUT, 'Model warm-up')
      } finally {
        prob.dispose()
      }
      return true
    } catch (error) {
      this.logger.error(error as Error)
      return false
    }
  }

  // Returns a scalar tensor = P(NSFW). Everything intermediate is freed by tidy;
  // the returned scalar is the caller's to dispose after reading it.
  private nsfwProbability (source: HTMLImageElement | HTMLCanvasElement): Tensor {
    return tidy(() => {
      const pixels = browser.fromPixels(source)
      const resized = tfImage.resizeBilinear(pixels, [INPUT_SIZE, INPUT_SIZE])
      const normalized = resized.toFloat().div(255).sub(NORM_MEAN).div(NORM_STD).expandDims(0)
      const logits = this.model?.predict(normalized) as Tensor
      return softmax(logits).reshape([2]).slice([NSFW_INDEX], [1]).reshape([])
    })
  }

  public async predict (image: HTMLImageElement, url: string): Promise<boolean> {
    if (this.model === null) throw new Error('Model is not loaded')

    const prob = this.nsfwProbability(image)
    const [probability] = await prob.data()
    prob.dispose()

    const result = probability >= this.threshold
    if (this.logger.status) {
      this.logger.log(`IMG prediction (ViT) is NSFW ${probability.toFixed(4)} (>= ${this.threshold.toFixed(4)} = ${result}) for ${url}`)
    }
    return result
  }

  public setSettings (settings: ClassifierSettings): void {
    this.threshold = strictnessToThreshold(settings.filterStrictness)
  }

  public dispose (): void {
    this.model?.dispose()
    this.model = null
  }
}
