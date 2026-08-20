import { PredictionQueue } from '../../src/background/Queue/PredictionQueue'
import { ILogger } from '../../src/utils/Logger'
import { IReduxedStorage } from '../../src/background/background'
import { OffscreenModel } from '../../src/background/OffscreenModel'

const makeQueue = (): PredictionQueue => {
  const logger = { log: () => {} } as unknown as ILogger
  const store = {
    getState: () => ({ statistics: { totalBlocked: 0 } }),
    dispatch: async () => {}
  } as unknown as IReduxedStorage

  return new PredictionQueue({} as unknown as OffscreenModel, logger, store)
}

describe('background => PredictionQueue => onFailure', () => {
  // A rejected prediction means no verdict came back, not that the image is
  // safe. Caching it would keep serving "safe" for that url until the cache is
  // cleared, so a transient model outage would silently unblock images.
  test('does not cache a url the model failed on', () => {
    const queue = makeQueue() as unknown as {
      requestMap: Map<string, unknown>
      cache: { has: (key: string) => boolean }
      onFailure: (param: { url: string, error: Error }) => void
    }

    const url = 'http://example.com/a.jpg'
    queue.requestMap.set(url, [[{ resolve: () => {}, reject: () => {} }]])
    queue.onFailure({ url, error: new Error('Model is unavailable') })

    expect(queue.cache.has(url)).toBe(false)
  })
})
