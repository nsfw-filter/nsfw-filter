import { ILogger } from '../../utils/Logger'
import { IReduxedStorage } from '../background'
import { LRUCache } from '../LRUCache'
import { Model } from '../Model'

export type requestQueueValue = Array<Array<{
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}>>

export type CallbackFunction = (err: unknown | undefined, result: unknown | undefined) => undefined

type KeyType<T, K extends keyof T> = T[K]
export type TabIdUrl = { tabId: number, tabUrl: string }
export const DEFAULT_TAB_ID = 999999

export class QueueBase {
  protected readonly model: Model
  protected readonly logger: ILogger

  protected readonly store: IReduxedStorage
  protected readonly currentTabIdUrls: Map<KeyType<TabIdUrl, 'tabId'>, KeyType<TabIdUrl, 'tabUrl'>>
  protected activeTabId: KeyType<TabIdUrl, 'tabId'>
  protected readonly DEFAULT_TAB_ID: number
  protected readonly requestMap: Map<string, requestQueueValue>
  protected readonly cache: LRUCache<string, boolean>

  protected totalBlocked: number

  constructor (model: Model, logger: ILogger, store: IReduxedStorage) {
    this.store = store
    this.model = model
    this.logger = logger

    this.requestMap = new Map()
    this.DEFAULT_TAB_ID = DEFAULT_TAB_ID
    this.activeTabId = this.DEFAULT_TAB_ID
    this.currentTabIdUrls = new Map([[this.DEFAULT_TAB_ID, `${this.DEFAULT_TAB_ID}`]])
    this.cache = new LRUCache(200)

    const state = this.store.getState()
    this.totalBlocked = state.statistics.totalBlocked
  }

  public clearCache (): void {
    this.cache.clear()
  }

  protected _checkUrlStatus (url: string): boolean {
    if (!this.requestMap.has(url)) {
      this.logger.log(`Cannot find image in requestMap where url is ${url}`)
      return false
    }

    return true
  }

  protected _checkCurrentTabIdUrlStatus ({ tabId, tabUrl }: { tabId: number, tabUrl: string }): boolean {
    if (!this.currentTabIdUrls.has(tabId)) {
      return false // user closed this tab id
    } else if (this.currentTabIdUrls.has(tabId) && tabUrl !== this.currentTabIdUrls.get(tabId)) {
      return false // user's tab id matches current tab id, but url references to an another page
    } else {
      return true
    }
  }
}
