import { LoadingQueue } from './LoadingQueue'

// @TODO Add tabs priority, when user opens 5 tabs at once and go to 4th tab - we need to switch to images prediction of 4th tab immediately
// @TODO Implement case where user goes back one page - we need to clear pending prediction images of this specific page from queue

type IQueueWrapper = {
  predict: (url: string, _tabId: number | undefined) => Promise<boolean>
  clearByTabId: (tabId: number) => void
}

export class QueueWrapper extends LoadingQueue implements IQueueWrapper {
  public async predict (url: string, _tabId: number | undefined): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      if (this.cache.has(url)) {
        resolve(this.cache.get(url) as boolean)
        return
      }

      const tabId = _tabId === undefined ? this.DEFAULT_TAB_ID : _tabId
      if (!this.activeTabs.has(tabId)) this.activeTabs.add(tabId)

      if (this.requestMap.has(url)) {
        this.requestMap.get(url)?.push([{ resolve, reject }])
      } else {
        this.requestMap.set(url, [[{ resolve, reject }]])
        this.loadingQueue.add({ url, tabId })
      }
    })
  }

  public clearByTabId (tabId: number): void {
    this.activeTabs.delete(tabId)
  }
}
