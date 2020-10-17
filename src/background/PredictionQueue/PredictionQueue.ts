import { IReduxedStorage } from 'background/background'

import { setTotalBlocked } from '../../popup/redux/actions/statistics'
import { ILogger } from '../../utils/Logger'
import { Model } from '../Model/Model'

import { ConcurrentQueue } from './ConcurrentQueue'

type IPredictionQueue = {
  predict: (url: string, _tabId: number | undefined) => Promise<boolean>
  clearByTabId: (tabId: number) => void
}

type PredictionQueueSettings = {
  concurrency: number
}

// @TODO Add tabs priority, when user opens 5 tabs at once and go to 4th tab - we need to switch to images prediction of 4th tab immediately
// @TODO Implement case where user goes back one page - we need to clear pending prediction images of this specific page from queue
// @TODO Predict concurrently 1, 2 or 3 images depends on user CPU info https://stackoverflow.com/a/42147178

type requestQueueValue = Array<Array<{
  resolve: (value: boolean) => void
  reject: (error: string) => void
  processing?: boolean
  tabId?: number
}>>

type HandlerParams = {
  url: string
  tabId: number
  result: boolean
  errMessage: string
}

type OnProcessParam = Pick<HandlerParams, 'url' | 'tabId'>
export type OnSuccessParam = Pick<HandlerParams, 'url' | 'result'>
export type OnFailureParam = Pick<HandlerParams, 'url' | 'errMessage'>
type OnDoneParam = Pick<HandlerParams, 'url'>

export type CallbackFunction = (err: unknown | undefined, result: unknown | undefined) => undefined

export class PredictionQueue implements IPredictionQueue {
  private readonly model: Model
  private readonly logger: ILogger

  private readonly store: IReduxedStorage
  private readonly activeTabs: Set<number>
  private readonly DEFAULT_TAB_ID: number
  private readonly requestMap: Map<string, requestQueueValue>
  private readonly concurrentQueue: ConcurrentQueue

  private totalBlocked: number

  constructor (model: Model, logger: ILogger, store: IReduxedStorage) {
    this.store = store
    this.model = model
    this.logger = logger

    this.requestMap = new Map()
    this.DEFAULT_TAB_ID = 999999
    this.activeTabs = new Set([this.DEFAULT_TAB_ID])

    const state = this.store.getState()
    this.totalBlocked = state.statistics.totalBlocked
    this.concurrentQueue = new ConcurrentQueue({
      concurrency: Number(state.settings.concurrency),
      onProcess: this.onProcess.bind(this),
      onSuccess: this.onSuccess.bind(this),
      onFailure: this.onFailure.bind(this),
      onDone: this.onDone.bind(this),
      onDrain: this.onDrain.bind(this)
    })
  }

  public setSettings (settings: PredictionQueueSettings): void {
    this.concurrentQueue.setConcurrency(settings.concurrency)
  }

  public async predict (url: string, _tabId: number | undefined): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      if (this.model.getCache().has(url)) {
        resolve(this.model.getCache().get(url) as boolean)
        return
      }

      const tabId = _tabId === undefined ? this.DEFAULT_TAB_ID : _tabId
      if (!this.activeTabs.has(tabId)) this.activeTabs.add(tabId)

      if (this.requestMap.has(url)) {
        this.requestMap.get(url)?.push([{ resolve, reject }])
      } else {
        this.requestMap.set(url, [[{ resolve, reject, tabId }]])
        this.concurrentQueue.add({ url, tabId, resolve, reject })
      }
    })
  }

  public clearByTabId (tabId: number): void {
    this.activeTabs.delete(tabId)
  }

  public async onProcess ({ url, tabId }: OnProcessParam, callback: CallbackFunction): Promise<void> {
    if (this.activeTabs.has(tabId)) {
      this.model.predictImage(url)
        .then(result => callback(undefined, { url, result }))
        .catch((error: Error) => callback({ url, errMessage: error.message }, undefined))
    } else {
      callback({ url, errMessage: 'User closed tab which contains this image url' }, undefined)
    }
  }

  public onSuccess ({ url, result }: OnSuccessParam): void {
    if (result) this.totalBlocked++

    if (this.requestMap.has(url)) {
      for (const [{ resolve }] of this.requestMap.get(url) as requestQueueValue) {
        resolve(result)
      }
    } else {
      this.onFailure({ url, errMessage: 'Cannot find values in requestMap' })
    }
  }

  public onFailure ({ url, errMessage }: OnFailureParam): void {
    if (this.requestMap.has(url)) {
      for (const [{ reject }] of this.requestMap.get(url) as requestQueueValue) {
        reject(errMessage)
      }
    } else {
      this.logger.log(`Stange stuff for ${url}`)
    }
  }

  public onDone ({ url }: OnDoneParam): void {
    this.requestMap.delete(url)
  }

  public onDrain (): void {
    this.activeTabs.clear()
    this.activeTabs.add(this.DEFAULT_TAB_ID)

    // @DOCS Async operations
    const tmpTotalBlocked = this.totalBlocked
    this.store.dispatch(setTotalBlocked(tmpTotalBlocked))
  }
}
