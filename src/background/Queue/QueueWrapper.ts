import { LoadingQueue } from './LoadingQueue'
import { TabIdUrl } from './QueueBase'

// @TODO Add tabs priority, when user opens 5 tabs at once(restore tabs) and go to 4th tab - we need to switch to images prediction of 4th tab immediately

type IQueueWrapper = {
  predict: (url: string, tabId: TabIdUrl) => Promise<boolean>
  clearByTabId: (tabId: number) => void
  addTabIdUrl: (tabIdUrl: TabIdUrl) => void
  updateTabIdUrl: (tabIdUrl: TabIdUrl) => void
  setActiveTabId: (tabId: number) => void
}

export class QueueWrapper extends LoadingQueue implements IQueueWrapper {
  public async predict (url: string, tabIdUrl: TabIdUrl): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      if (this.cache.has(url)) {
        resolve(this.cache.get(url) as boolean)
        return
      }

      if (this.requestMap.has(url)) {
        this.requestMap.get(url)?.push([{ resolve, reject }])
      } else {
        this.requestMap.set(url, [[{ resolve, reject }]])
        this.loadingQueue.add({ url, tabIdUrl })
      }
    })
  }

  public addTabIdUrl (tabIdUrl: TabIdUrl): void {
    const { tabId, tabUrl } = tabIdUrl
    this.currentTabIdUrls.set(tabId, tabUrl)
  }

  public updateTabIdUrl (tabIdUrl: TabIdUrl): void {
    const { tabId, tabUrl } = tabIdUrl
    this.currentTabIdUrls.set(tabId, tabUrl)
  }

  public clearByTabId (tabId: number): void {
    if (this.currentTabIdUrls.has(tabId)) {
      this.currentTabIdUrls.delete(tabId)
    }
  }

  public setActiveTabId (tabId: number): void {
    this.activeTabId = tabId
  }
}
