import { PredictionQueue } from '../../src/background/Queue/PredictionQueue'
import { ILogger } from '../../src/utils/Logger'
import { IReduxedStorage } from '../../src/background/background'
import { OffscreenModel } from '../../src/background/OffscreenModel'

const makeQueue = (model: Partial<OffscreenModel> = {}): PredictionQueue => {
  const logger = { log: () => {} } as unknown as ILogger
  const store = {
    getState: () => ({ statistics: { totalBlocked: 0 } }),
    dispatch: async () => {}
  } as unknown as IReduxedStorage

  return new PredictionQueue(model as OffscreenModel, logger, store)
}

describe('background => PredictionQueue => onFailure', () => {
  // A rejected prediction means no verdict, not a safe image. Caching it would
  // serve "safe" for that url until the cache is cleared, so a transient model
  // outage would silently unblock images.
  test('does not cache a url the model failed on', () => {
    const queue = makeQueue() as unknown as {
      requestMap: Map<string, unknown>
      cache: { has: (key: string) => boolean }
      onFailure: (param: { url: string, error: Error }) => void
    }

    const url = 'http://example.com/a.jpg'
    queue.requestMap.set(JSON.stringify(['image', url]), [[{ resolve: () => {}, reject: () => {} }]])
    queue.onFailure({ url, error: new Error('Model is unavailable') })

    expect(queue.cache.has(JSON.stringify(['image', url]))).toBe(false)
  })
})

// A video frame has no url of its own: it travels as a data url under a one-off
// key. Losing that payload on the way to the model would classify nothing, and
// caching a verdict under a key nothing asks for again evicts real entries.
describe('background => PredictionQueue => frame sources', () => {
  const FRAME = 'data:image/jpeg;base64,frame'
  const KEY = 'nsfw-filter-frame:1-1'

  test('classifies the frame itself and labels it with its key', async () => {
    const predict = jest.fn(async () => await Promise.resolve(false))
    const queue = makeQueue({ predict }) as unknown as {
      currentTabIdUrls: Map<number, string>
      onProcess: (param: { url: string, source?: string, mediaType?: 'image' | 'video', tabIdUrl: unknown }, callback: unknown) => void
    }

    const tabIdUrl = { tabId: 1, tabUrl: 'http://example.com' }
    queue.currentTabIdUrls.set(tabIdUrl.tabId, tabIdUrl.tabUrl)
    queue.onProcess({ url: KEY, source: FRAME, mediaType: 'video', tabIdUrl }, () => undefined)

    expect(predict).toHaveBeenCalledWith(FRAME, KEY, 'video')
  })

  test('does not cache a verdict for a one-off frame key', () => {
    const queue = makeQueue() as unknown as {
      requestMap: Map<string, unknown>
      cache: { has: (key: string) => boolean }
      onSuccess: (param: { url: string, source?: string, mediaType?: 'image' | 'video', result: boolean }) => void
    }

    queue.requestMap.set(JSON.stringify(['video', KEY]), [[{ resolve: () => {}, reject: () => {} }]])
    queue.onSuccess({ url: KEY, source: FRAME, mediaType: 'video', result: false })

    expect(queue.cache.has(JSON.stringify(['video', KEY]))).toBe(false)
  })

  test('still caches a verdict for a real url', () => {
    const queue = makeQueue() as unknown as {
      requestMap: Map<string, unknown>
      cache: { has: (key: string) => boolean }
      onSuccess: (param: { url: string, source?: string, mediaType?: 'image' | 'video', result: boolean }) => void
    }

    const url = 'http://example.com/a.jpg'
    queue.requestMap.set(JSON.stringify(['image', url]), [[{ resolve: () => {}, reject: () => {} }]])
    queue.onSuccess({ url, result: false })

    expect(queue.cache.has(JSON.stringify(['image', url]))).toBe(true)
  })
})
