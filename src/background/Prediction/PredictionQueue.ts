import { Model } from './Model'
import { NSFWJS } from '@nsfw-filter/nsfwjs'
import { ILogger } from '../../utils/Logger'

type IPredictionQueue = {
  predict: (url: string, _tabId: number | undefined) => Promise<boolean>
  clearByTabId: (tabId: number) => void
}

// @TODO Add tabs priority, when user opens 5 tabs at once and go to 4th tab - we need to switch to images prediction of 4th tab immediately
// @TODO Implement case where user goes back one page - we need to clear pending prediction images of this specific page from queue
// @TODO Predict concurrently 1, 2 or 3 images depends on user CPU info https://stackoverflow.com/a/42147178

type requestQueueValue = Array<Array<{
  resolve: (value: boolean) => void
  reject: (error: Error) => void
  tabId: number
}>>

export class PredictionQueue extends Model implements IPredictionQueue {
  private counter: number
  private readonly activeTabs: Set<number>
  private readonly DEFAULT_TAB_ID: number
  private readonly requestQueue: Map<string, requestQueueValue>

  constructor (model: NSFWJS, logger: ILogger) {
    super(model, logger)

    this.requestQueue = new Map()
    this.counter = 0
    this.DEFAULT_TAB_ID = 999999
    this.activeTabs = new Set([this.DEFAULT_TAB_ID])
  }

  public async predict (url: string, _tabId: number | undefined): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      const queueName = url
      const tabId = _tabId === undefined ? this.DEFAULT_TAB_ID : _tabId

      if (!this.activeTabs.has(tabId)) this.activeTabs.add(tabId)

      if (this.requestQueue.has(queueName)) {
        this.requestQueue.get(queueName)?.push([{ resolve, reject, tabId }])
      } else {
        this.requestQueue.set(queueName, [[{ resolve, reject, tabId }]])
        if (this.requestQueue.size <= 1) {
          this.addPrediction({ url, reject }).then(() => { }, () => { })
        }
      }
    })
  }

  public clearByTabId (tabId: number): void {
    this.activeTabs.delete(tabId)
  }

  private async addPrediction ({ url, reject }: { url: string, reject: (reason: Error) => void }): Promise<void> {
    this.counter++
    const queueName = url

    try {
      const result = await this.predictImage(url)
      for (const [{ resolve }] of this.requestQueue.get(queueName) as requestQueueValue) {
        resolve(result)
      }
    } catch (error) {
      if (this.requestQueue.has(queueName)) {
        for (const [{ reject }] of this.requestQueue.get(queueName) as requestQueueValue) {
          reject(error)
        }
      } else {
        reject(error)
      }
    } finally {
      this.setupNext()
      this.requestQueue.delete(queueName)
      this.counter--
    }
  }

  private setupNext (): void {
    setTimeout(() => {
      if (this.counter === 0 && this.requestQueue.size > 0) {
        const [url, requestQueueData] = this.requestQueue.entries().next().value
        const [[{ tabId, reject }]] = requestQueueData

        if (this.activeTabs.has(tabId)) {
          this.addPrediction({ url, reject }).then(() => { }, () => { })
        } else {
          for (const [{ reject }] of requestQueueData) {
            reject('User closed tab which contains this image url')
          }

          this.setupNext()
          this.requestQueue.delete(url)
        }
      }
    }, 0)
  }
}
