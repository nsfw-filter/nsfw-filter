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
  errMessage: string
}

type OnProcessParam = Pick<HandlerParams, 'url' | 'image' | 'tabId'>
export type OnSuccessParam = Pick<HandlerParams, 'url' | 'result'>
export type OnFailureParam = Pick<HandlerParams, 'url' | 'errMessage'>
type OnDoneParam = Pick<HandlerParams, 'url'>

export type CallbackFunction = (err: unknown | undefined, result: unknown | undefined) => undefined

type PredictionQueueTask = {
  image: HTMLImageElement
  url: string
  tabId: number
}

export class PredictionQueue extends QueueBase {
  protected readonly predictionQueue: ConcurrentQueue<PredictionQueueTask>

  constructor (model: Model, logger: ILogger, store: IReduxedStorage) {
    super(model, logger, store)

    this.predictionQueue = new ConcurrentQueue({
      concurrency: 1, // We dont need more concurrent jobs here because this queue does CPU-bound task, it means that it blocks event loop anyway
      timeout: 0, // We need to predict images ASAP
      onProcess: this.onProcess.bind(this),
      onSuccess: this.onSuccess.bind(this),
      onFailure: this.onFailure.bind(this),
      onDone: this.onDone.bind(this),
      onDrain: this.onDrain.bind(this)
    })
  }

  private onProcess ({ url, image, tabId }: OnProcessParam, callback: CallbackFunction): void {
    if (!this.activeTabs.has(tabId)) {
      callback({ url, errMessage: 'User closed tab which contains this image url' }, undefined)
      return
    }

    this.model.predictImage(image, url)
      .then(result => callback(undefined, { url, result }))
      .catch((error: Error) => callback({ url, errMessage: error.message }, undefined))
  }

  private onSuccess ({ url, result }: OnSuccessParam): void {
    if (!this._checkUrlStatus(url)) return

    if (result) this.totalBlocked++
    this.cache.set(url, result)

    for (const [{ resolve }] of this.requestMap.get(url) as requestQueueValue) {
      resolve(result)
    }
  }

  private onFailure ({ url, errMessage }: OnFailureParam): void {
    if (!this._checkUrlStatus(url)) return

    this.cache.set(url, false)

    for (const [{ reject }] of this.requestMap.get(url) as requestQueueValue) {
      reject(errMessage)
    }
  }

  private onDone ({ url }: OnDoneParam): void {
    this.requestMap.delete(url)
  }

  private onDrain (): void {
    // @DOCS Async operations
    const tmpTotalBlocked = this.totalBlocked
    this.store.dispatch(setTotalBlocked(tmpTotalBlocked))
  }
}
