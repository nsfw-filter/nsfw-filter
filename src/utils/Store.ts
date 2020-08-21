export type counterData = {
  images: number
  videos: number
}

type IStore = {
  saveCounters: (data: counterData) => Promise<counterData>
  getCounters: () => Promise<counterData>
}

export class Store implements IStore {
  private readonly COUNTER_KEY: string

  constructor () {
    this.COUNTER_KEY = 'stats_counter'
  }

  public async saveCounters (value: counterData): Promise<counterData> {
    return await new Promise((resolve, reject) => {
      const data = { [this.COUNTER_KEY]: value }
      chrome.storage.local.set(data, () => resolve(value))
    })
  }

  public async getCounters (): Promise<counterData> {
    return await new Promise((resolve, reject) => {
      chrome.storage.local.get([this.COUNTER_KEY], result => {
        resolve(result[this.COUNTER_KEY])
      })
    })
  }
}
