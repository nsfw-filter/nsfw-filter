import { NSFWJS, predictionType } from '@nsfw-filter/nsfwjs'
import { ILogger } from '../utils/Logger'
import { LRUCache } from '../utils/LRUCache'

type IModel = {
  predictImage: (url: string, _tabId: number | undefined) => Promise<boolean>
  clearByTabId: (tabId: number) => void
}

export class Model implements IModel {
  private readonly model: NSFWJS
  private readonly GIF_REGEX: RegExp
  private readonly FILTER_LIST: string[]
  private readonly IMAGE_SIZE: number
  private readonly logger: ILogger
  private counter: number
  private readonly LRUCache: LRUCache
  private readonly activeTabs: Set<number>
  private readonly DEFAULT_TAB_ID: number
  private readonly requestQueue: Map<string, Array<Array<{
    resolve: (value: boolean) => void
    reject: (error: Error) => void
    tabId: number
  }>>>

  constructor (model: NSFWJS, logger: ILogger) {
    this.model = model
    this.logger = logger
    this.GIF_REGEX = /^.*(.gif)($|\W.*$)/
    this.FILTER_LIST = ['Hentai', 'Porn', 'Sexy']
    this.IMAGE_SIZE = 224
    this.requestQueue = new Map()
    this.counter = 0
    this.DEFAULT_TAB_ID = 999999
    this.activeTabs = new Set([this.DEFAULT_TAB_ID])
    this.LRUCache = new LRUCache(200)

    this.logger.log('Model is loaded')
  }

  public async predictImage (url: string, _tabId: number | undefined): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      const queueName = url
      const tabId = _tabId === undefined ? this.DEFAULT_TAB_ID : _tabId

      if (!this.activeTabs.has(tabId)) this.activeTabs.add(tabId)

      if (this.requestQueue.has(queueName)) {
        // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
        this.requestQueue.get(queueName).push([{ resolve, reject, tabId }])
      } else {
        this.requestQueue.set(queueName, [[{ resolve, reject, tabId }]])
        if (this.requestQueue.size <= 1) {
          this.addPrediction({ url, reject }).then(() => { }, () => { })
        }
      }
    })
  }

  // @TODO Add tabs priority, when user opens 5 tabs at once and go to 4th tab - we need to switch to images prediction of 4th tab immediately
  // @TODO Implement case where user goes back one page - we need to clear pending prediction images of this specific page from queue

  public clearByTabId (tabId: number): void {
    this.activeTabs.delete(tabId)
  }

  private async addPrediction ({ url, reject }: { url: string, reject: (reason: Error) => void }): Promise<void> {
    this.counter++
    const queueName = url

    try {
      const result = await this._predictImage(url)
      // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
      for (const [{ resolve }] of this.requestQueue.get(queueName)) {
        resolve(result)
      }
    } catch (error) {
      if (this.requestQueue.has(queueName)) {
        // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
        for (const [{ reject }] of this.requestQueue.get(queueName)) {
          reject(error)
        }
      } else {
        reject(error)
      }
    } finally {
      this.setupNext()
      this.requestQueue.delete(queueName)
      this.counter--
    }
  }

  // @TODO Predict concurrently 1, 2 or 3 images depends on user CPU info https://stackoverflow.com/a/42147178
  private setupNext (): void {
    setTimeout(() => {
      if (this.counter === 0 && this.requestQueue.size > 0) {
        const [url, requestQueueData] = this.requestQueue.entries().next().value
        const [[{ tabId, reject }]] = requestQueueData

        if (this.activeTabs.has(tabId)) {
          this.addPrediction({ url, reject }).then(() => { }, () => { })
        } else {
          for (const [{ reject }] of requestQueueData) {
            reject('User closed tab which contains this image url')
          }

          this.setupNext()
          this.requestQueue.delete(url)
        }
      }
    }, 0)
  }

  private async _predictImage (url: string): Promise<boolean> {
    // @ts-expect-error https://github.com/microsoft/TypeScript/issues/13086
    if (this.LRUCache.has(url)) return this.LRUCache.get(url)

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
      return this.FILTER_LIST.includes(className) && probability > 0.4
    })

    if (prediction !== undefined) return ({ result: true, ...prediction })

    return ({ result: false, className: flattenArr[0].className, probability: flattenArr[0].probability })
  }
}
