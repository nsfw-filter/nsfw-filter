import { ILogger } from '../../utils/Logger'
import { IReduxedStorage } from '../background'
import { LRUCache } from '../LRUCache'
import { Model } from '../Model'

export type requestQueueValue = Array<Array<{
  resolve: (value: boolean) => void
  reject: (error: string) => void
  processing?: boolean
  tabId?: number
}>>

export type CallbackFunction = (err: unknown | undefined, result: unknown | undefined) => undefined

export class QueueBase {
  protected readonly model: Model
  protected readonly logger: ILogger

  protected readonly store: IReduxedStorage
  protected readonly activeTabs: Set<number>
  protected readonly DEFAULT_TAB_ID: number
  protected readonly requestMap: Map<string, requestQueueValue>
  protected readonly cache: LRUCache<string, boolean>

  protected totalBlocked: number

  constructor (model: Model, logger: ILogger, store: IReduxedStorage) {
    this.store = store
    this.model = model
    this.logger = logger

    this.requestMap = new Map()
    this.DEFAULT_TAB_ID = 999999
    this.activeTabs = new Set([this.DEFAULT_TAB_ID])
    this.cache = new LRUCache(200)

    const state = this.store.getState()
    this.totalBlocked = state.statistics.totalBlocked
  }

  protected _checkUrlStatus (url: string): boolean {
    if (!this.requestMap.has(url)) {
      this.logger.log(`Cannot find image in requestMap where url is ${url}`)
      return false
    }

    return true
  }
}
