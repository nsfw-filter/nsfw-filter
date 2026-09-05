import { Logger } from '../../src/utils/Logger'
import { RESTART_KEY, readRestartState, saveRestartState } from '../../src/offscreen/restartState'

// sessionStorage is how the settings the service worker already pushed survive the
// reload onto WASM, so a record it cannot read costs the user their settings.

const memoryStorage = (): Storage => {
  const items = new Map<string, string>()

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value) },
    removeItem: (key: string) => { items.delete(key) },
    clear: () => { items.clear() },
    key: (index: number) => [...items.keys()][index] ?? null,
    get length () { return items.size }
  }
}

const logger = new Logger()

describe('offscreen => restartState', () => {
  test('Should round-trip the settings a restart has to carry over', () => {
    const storage = memoryStorage()
    const state = { filterStrictness: 42, trainedModel: 'ViT_NSFW_384' as const, logging: true }

    saveRestartState(storage, state)

    expect(readRestartState(storage, logger)).toEqual(state)
  })

  test('Should report a first start when nothing was saved', () => {
    expect(readRestartState(memoryStorage(), logger)).toBe(null)
  })

  test('Should fall back to a first start on a record it cannot parse', () => {
    const storage = memoryStorage()
    storage.setItem(RESTART_KEY, 'not json')

    expect(readRestartState(storage, logger)).toBe(null)
  })
})
