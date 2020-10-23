import { ILogger } from '../../utils/Logger'
import { IReduxedStorage } from '../background'
import { Model } from '../Model'

import { ConcurrentQueue } from './ConcurrentQueue'
import { PredictionQueue } from './PredictionQueue'
import { requestQueueValue } from './QueueBase'

type HandlerParams = {
  url: string
  image: HTMLImageElement
  tabId: number
  errMessage: string
}

type OnProcessParam = Pick<HandlerParams, 'url' | 'tabId'>
type OnSuccessParam = Pick<HandlerParams, 'url' | 'tabId' | 'image'>
type OnFailureParam = Pick<HandlerParams, 'url' | 'errMessage'>

export type CallbackFunction = (err: unknown | undefined, result: unknown | undefined) => undefined

export class LoadingQueue extends PredictionQueue {
  private readonly IMAGE_SIZE: number
  private readonly LOADING_TIMEOUT: number
  protected readonly loadingQueue: ConcurrentQueue<OnProcessParam>

  constructor (model: Model, logger: ILogger, store: IReduxedStorage) {
    super(model, logger, store)

    this.IMAGE_SIZE = 224
    this.LOADING_TIMEOUT = 1000
    this.loadingQueue = new ConcurrentQueue({
      concurrency: 2, // We need another concurrent IO job if image stuck for 1 sec with loading timeout
      timeout: 0,
      onProcess: this.onLoadingProcess.bind(this),
      onSuccess: this.onLoadingSuccess.bind(this),
      onFailure: this.onLoadingFailure.bind(this)
    })
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

  private onLoadingProcess ({ url, tabId }: OnProcessParam, callback: CallbackFunction): void {
    if (!this.activeTabs.has(tabId)) {
      callback({ url, errMessage: 'User closed tab which contains this image url' }, undefined)
      return
    }

    this.loadImage(url)
      .then(image => callback(undefined, { url, image, tabId }))
      .catch((error: Error) => callback({ url, errMessage: error.message }, undefined))
  }

  private onLoadingSuccess ({ url, image, tabId }: OnSuccessParam): void {
    if (!this._checkUrlStatus(url)) return

    if (!this.pauseFlag && this.predictionQueue.getTaskAmount() >= 15) {
      this.pauseFlag = true
      this.loadingQueue.pause()
    }

    this.predictionQueue.add({ url, image, tabId })
  }

  private onLoadingFailure ({ url, errMessage }: OnFailureParam): void {
    if (!this._checkUrlStatus(url)) return

    for (const [{ reject }] of this.requestMap.get(url) as requestQueueValue) {
      reject(errMessage)
    }
  }
}
