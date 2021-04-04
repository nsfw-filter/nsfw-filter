import { ILogger } from '../../utils/Logger'
import { IReduxedStorage } from '../background'
import { Model } from '../Model'

import { ConcurrentQueue } from './ConcurrentQueue'
import { PredictionQueue } from './PredictionQueue'
import { requestQueueValue, TabIdUrl } from './QueueBase'

type HandlerParams = {
  url: string
  image: HTMLImageElement
  tabIdUrl: TabIdUrl
  error: Error
}

type OnProcessParam = Pick<HandlerParams, 'url' | 'tabIdUrl'>
type OnSuccessParam = Pick<HandlerParams, 'url' | 'tabIdUrl' | 'image'>
type OnFailureParam = Pick<HandlerParams, 'url' | 'error'>

export type CallbackFunction = (err: OnFailureParam | undefined, result: OnSuccessParam | undefined) => void

export class LoadingQueue extends PredictionQueue {
  private readonly IMAGE_SIZE: number
  private readonly LOADING_TIMEOUT: number
  protected readonly loadingQueue: ConcurrentQueue<OnProcessParam>

  constructor (model: Model, logger: ILogger, store: IReduxedStorage) {
    super(model, logger, store)

    this.IMAGE_SIZE = 224
    this.LOADING_TIMEOUT = 1000
    this.loadingQueue = new ConcurrentQueue({
      concurrency: 100, // We need another concurrent IO job if image stuck for 1 sec with loading timeout
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

  private onLoadingProcess ({ url, tabIdUrl }: OnProcessParam, callback: CallbackFunction): void {
    if (!this._checkCurrentTabIdUrlStatus(tabIdUrl)) {
      callback({ url, error: new Error('User closed tab or page where this url located') }, undefined)
      return
    }

    this.loadImage(url)
      .then(image => callback(undefined, { url, image, tabIdUrl }))
      .catch((error: Error) => callback({ url, error }, undefined))
  }

  private onLoadingSuccess ({ url, image, tabIdUrl }: OnSuccessParam): void {
    if (!this._checkUrlStatus(url)) return

    this.predictionQueue.add({ url, image, tabIdUrl })
  }

  private onLoadingFailure ({ url, error }: OnFailureParam): void {
    if (!this._checkUrlStatus(url)) return

    for (const [{ reject }] of this.requestMap.get(url) as requestQueueValue) {
      reject(error)
    }

    this.cache.set(url, false)
    this.requestMap.delete(url)
  }
}
