import { setTotalBlocked } from '../../popup/redux/actions/statistics'
import { ILogger } from '../../utils/Logger'
import { IReduxedStorage } from '../background'
import { Model } from '../Model'

import { ConcurrentQueue } from './ConcurrentQueue'
import { QueueBase, requestQueueValue } from './QueueBase'

type HandlerParams = {
  url: string
  tabId: number
  image: HTMLImageElement
  result: boolean
  error: Error
}

type OnProcessParam = Pick<HandlerParams, 'url' | 'image' | 'tabId'>
export type OnSuccessParam = Pick<HandlerParams, 'url' | 'result'>
export type OnFailureParam = Pick<HandlerParams, 'url' | 'error'>
type OnDoneParam = Pick<HandlerParams, 'url'>

export type CallbackFunction = (err: unknown | undefined, result: unknown | undefined) => undefined

export class PredictionQueue extends QueueBase {
  protected readonly predictionQueue: ConcurrentQueue<OnProcessParam>
  protected pauseFlag: boolean

  constructor (model: Model, logger: ILogger, store: IReduxedStorage) {
    super(model, logger, store)

    this.predictionQueue = new ConcurrentQueue({
      concurrency: 1, // We dont need more concurrent jobs here because this queue does CPU-bound task, it means that it blocks event loop anyway
      timeout: 0,
      onProcess: this.onProcess.bind(this),
      onSuccess: this.onSuccess.bind(this),
      onFailure: this.onFailure.bind(this),
      onDone: this.onDone.bind(this),
      onDrain: this.onDrain.bind(this)
    })

    this.pauseFlag = false
  }

  private onProcess ({ url, image, tabId }: OnProcessParam, callback: CallbackFunction): void {
    if (!this.activeTabs.has(tabId)) {
      callback({ url, error: new Error(`User closed ${tabId} tab which contains this image url ${url}`) }, undefined)
      return
    }

    this.model.predictImage(image, url)
      .then(result => callback(undefined, { url, result }))
      .catch((error: Error) => callback({ url, error }, undefined))
  }

  private onSuccess ({ url, result }: OnSuccessParam): void {
    if (!this._checkUrlStatus(url)) return

    if (result) this.totalBlocked++
    this.cache.set(url, result)

    for (const [{ resolve }] of this.requestMap.get(url) as requestQueueValue) {
      resolve(result)
    }

    if (this.pauseFlag && this.predictionQueue.getTaskAmount() <= 7) {
      this.pauseFlag = false
      // @ts-expect-error
      this.loadingQueue.resume()
    }
  }

  private onFailure ({ url, error }: OnFailureParam): void {
    if (!this._checkUrlStatus(url)) return

    this.cache.set(url, false)

    for (const [{ reject }] of this.requestMap.get(url) as requestQueueValue) {
      reject(error)
    }
  }

  private onDone ({ url }: OnDoneParam): void {
    this.requestMap.delete(url)
  }

  private onDrain (): void {
    this.pauseFlag = false
    // @ts-expect-error
    this.loadingQueue.resume()

    // @DOCS Async operations
    const tmpTotalBlocked = this.totalBlocked
    this.store.dispatch(setTotalBlocked(tmpTotalBlocked))
  }
}
