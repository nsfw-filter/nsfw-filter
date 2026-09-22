import { setTotalBlocked } from '../../popup/redux/actions/statistics'
import { ILogger } from '../../utils/Logger'
import { MediaType } from '../../utils/messages'
import { IReduxedStorage } from '../background'
import { OffscreenModel } from '../OffscreenModel'

import { ConcurrentQueue } from './ConcurrentQueue'
import { QueueBase, requestQueueValue, TabIdUrl } from './QueueBase'

type HandlerParams = {
  url: string
  source?: string
  mediaType?: MediaType
  tabIdUrl: TabIdUrl
  result: boolean
  error: Error
}

type OnProcessParam = Pick<HandlerParams, 'url' | 'mediaType' | 'tabIdUrl' | 'source'>
export type OnSuccessParam = Pick<HandlerParams, 'url' | 'mediaType' | 'result' | 'source'>
export type OnFailureParam = Pick<HandlerParams, 'url' | 'mediaType' | 'error'>
type OnDoneParam = Pick<HandlerParams, 'url' | 'mediaType'>

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

  private onProcess ({ url, source, mediaType, tabIdUrl }: OnProcessParam, callback: CallbackFunction): void {
    if (!this._checkCurrentTabIdUrlStatus(tabIdUrl)) {
      callback({ url, mediaType, error: new Error('User closed tab or page where this url located') }, undefined)
      return
    }

    this.model.predict(source ?? url, url, mediaType)
      .then(result => callback(undefined, { url, source, mediaType, result }))
      .catch((error: Error) => callback({ url, mediaType, error }, undefined))
  }

  private onSuccess ({ url, source, mediaType, result }: OnSuccessParam): void {
    const key = this.requestKey(url, mediaType)
    if (!this._checkUrlStatus(key)) return

    if (result) this.totalBlocked++
    // A request carrying its own source is a video frame under a one-off key.
    // Caching a verdict under a key nothing will ask for again only evicts
    // entries that are still worth keeping.
    if (source === undefined) this.cache.set(key, result)

    for (const [{ resolve }] of this.requestMap.get(key) as requestQueueValue) {
      resolve(result)
    }
  }

  private onFailure ({ url, mediaType, error }: OnFailureParam): void {
    const key = this.requestKey(url, mediaType)
    if (!this._checkUrlStatus(key)) return

    // Not cached. A failure means no verdict, usually an unavailable model rather
    // than a safe image, so caching `false` would keep serving "safe" for that URL
    // until the entry is evicted.

    for (const [{ reject }] of this.requestMap.get(key) as requestQueueValue) {
      reject(error)
    }
  }

  private onDone ({ url, mediaType }: OnDoneParam): void {
    this.requestMap.delete(this.requestKey(url, mediaType))
  }

  private onDrain (): void {
    // @DOCS Async operations
    const tmpTotalBlocked = this.totalBlocked
    this.store.dispatch(setTotalBlocked(tmpTotalBlocked))
  }
}
