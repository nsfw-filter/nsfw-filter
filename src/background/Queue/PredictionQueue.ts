import { setTotalBlocked } from '../../popup/redux/actions/statistics'
import { ILogger } from '../../utils/Logger'
import { IReduxedStorage } from '../background'
import { OffscreenModel } from '../OffscreenModel'

import { ConcurrentQueue } from './ConcurrentQueue'
import { QueueBase, requestQueueValue, TabIdUrl } from './QueueBase'

type HandlerParams = {
  url: string
  tabIdUrl: TabIdUrl
  result: boolean
  error: Error
}

type OnProcessParam = Pick<HandlerParams, 'url' | 'tabIdUrl'>
export type OnSuccessParam = Pick<HandlerParams, 'url' | 'result'>
export type OnFailureParam = Pick<HandlerParams, 'url' | 'error'>
type OnDoneParam = Pick<HandlerParams, 'url'>

export type CallbackFunction = (err: unknown | undefined, result: unknown | undefined) => undefined

// Manifest V2 split this into a LoadingQueue (download the image into an <img>)
// and a PredictionQueue (run the model). Under Manifest V3 both happen inside the
// offscreen document, so one queue forwards each URL to the offscreen model.
// Image loading still runs in parallel (high concurrency here) while the offscreen
// document serialises the predictions, matching the original behaviour.
export class PredictionQueue extends QueueBase {
  protected readonly predictionQueue: ConcurrentQueue<OnProcessParam>

  constructor (model: OffscreenModel, logger: ILogger, store: IReduxedStorage) {
    super(model, logger, store)

    this.predictionQueue = new ConcurrentQueue({
      concurrency: 100, // IO-bound image loads run in parallel in the offscreen doc
      timeout: 0,
      onProcess: this.onProcess.bind(this),
      onSuccess: this.onSuccess.bind(this),
      onFailure: this.onFailure.bind(this),
      onDone: this.onDone.bind(this),
      onDrain: this.onDrain.bind(this)
    })
  }

  private onProcess ({ url, tabIdUrl }: OnProcessParam, callback: CallbackFunction): void {
    if (!this._checkCurrentTabIdUrlStatus(tabIdUrl)) {
      callback({ url, error: new Error('User closed tab or page where this url located') }, undefined)
      return
    }

    this.model.predict(url)
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
    // @DOCS Async operations
    const tmpTotalBlocked = this.totalBlocked
    this.store.dispatch(setTotalBlocked(tmpTotalBlocked))
  }
}
