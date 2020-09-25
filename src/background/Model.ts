import { NSFWJS, predictionType } from '@nsfw-filter/nsfwjs'
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
  private counter: number
  private readonly requestQueue: Map<string, Array<Array<{
    resolve: (value: boolean) => void
    reject: (error: Error) => void
  }>>>

  constructor (model: NSFWJS, logger: ILogger) {
    this.model = model
    this.logger = logger
    this.GIF_REGEX = /^.*(.gif)($|\W.*$)/
    this.FILTER_LIST = ['Hentai', 'Porn', 'Sexy']
    this.IMAGE_SIZE = 224
    this.requestQueue = new Map()
    this.counter = 0

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
    return await new Promise((resolve, reject) => {
      const queueName = url

      if (this.requestQueue.has(queueName)) {
        // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
        this.requestQueue.get(queueName).push([{ resolve, reject }])
      } else {
        this.requestQueue.set(queueName, [[{ resolve, reject }]])
        if (this.requestQueue.size <= 1) {
          this.addPrediction({ url, reject })
        }
      }
    })
  }

  private addPrediction ({ url, reject }: { url: string, reject: (reason: Error) => void }): void {
    this.counter++
    const queueName = url

    this._predictImage(url)
      .then(result => {
        // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
        for (const [{ resolve }] of this.requestQueue.get(queueName)) {
          resolve(result)
        }

        this.requestQueue.delete(queueName)
        this.goNext()
      }).catch(error => {
        if (this.requestQueue.has(queueName)) {
          // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
          for (const [{ reject }] of this.requestQueue.get(queueName)) {
            reject(error)
          }
          this.requestQueue.delete(queueName)
        } else {
          reject(error)
        }
        this.goNext()
      })
  }

  private goNext (): void {
    this.counter--

    if (this.counter === 0 && this.requestQueue.size > 0) {
      const [url, { reject }] = this.requestQueue.entries().next().value

      const params = { url, reject }
      setTimeout(() => this.addPrediction(params), 0)
    }
  }

  private async _predictImage (url: string): Promise<boolean> {
    const image = await this.loadImage(url)

    const prediction = await this.model.classify(image, 1)
    const { result, className, probability } = this.handlePredictions([prediction])
    if (result) {
      this.logger.log(`IMG prediction for ${url} is ${className} ${probability}`)
      return result
    }

    if (this.GIF_REGEX.test(url)) {
      const predictionGIF = await this.model.classifyGif(image, { topk: 1, fps: 0.1 })
      const { result, className, probability } = this.handlePredictions(predictionGIF)
      this.logger.log(`GIF prediction for ${url} is ${className} ${probability}`)
      return result
    }

    this.logger.log(`IMG prediction for ${url} is ${className} ${probability}`)
    return Boolean(result)
  }

  private handlePredictions (predictions: predictionType[][]): { result: boolean, className: string, probability: number } {
    const flattenArr = predictions.flat()

    const prediction = flattenArr.find(({ className, probability }) => {
      return this.FILTER_LIST.includes(className) && probability > 0.4
    })

    if (prediction !== undefined) return ({ result: true, ...prediction })

    return ({ result: false, className: flattenArr[0].className, probability: flattenArr[0].probability })
  }
}
