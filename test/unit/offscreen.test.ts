/**
 * @jest-environment jsdom
 */

// Drives the real offscreen orchestration -- the message listener, the op chain,
// and switchTo -- against a stubbed tfjs and stubbed classifiers. Nothing here
// tests inference; it tests what happens to a model when a prediction never
// comes back.

import { OffscreenClassifyResponse, OffscreenRequest, RESTARTING_MESSAGE } from '../../src/utils/messages'
import { RESTART_KEY, RestartState } from '../../src/offscreen/restartState'
import { TrainedModel } from '../../src/utils/models'

type FakeClassifier = {
  trainedModel: TrainedModel
  load: jest.Mock
  predict: jest.Mock
  setSettings: jest.Mock
  dispose: jest.Mock
}

type Registry = {
  created: FakeClassifier[]
  // Urls whose prediction hangs until settle() is called for them.
  stuck: Set<string>
  settle: (url: string) => void
}

const holding = new Map<string, (result: boolean) => void>()

const mockRegistry: Registry = {
  created: [],
  stuck: new Set(),
  settle: (url: string) => { holding.get(url)?.(false); holding.delete(url) }
}

const makeClassifier = (trainedModel: TrainedModel): FakeClassifier => {
  const classifier: FakeClassifier = {
    trainedModel,
    load: jest.fn(async () => true),
    predict: jest.fn(async (_image: unknown, url: string) => await new Promise<boolean>(resolve => {
      if (!mockRegistry.stuck.has(url)) resolve(false)
      else holding.set(url, resolve)
    })),
    setSettings: jest.fn(),
    dispose: jest.fn()
  }

  mockRegistry.created.push(classifier)
  return classifier
}

jest.mock('@tensorflow/tfjs', () => {
  let backend = ''
  return {
    enableProdMode: jest.fn(),
    env: () => ({ set: jest.fn() }),
    getBackend: () => backend,
    setBackend: jest.fn(async (name: string) => { backend = name; return true }),
    tensor1d: () => ({ square: () => ({ data: async () => [1], dispose: jest.fn() }) }),
    tidy: (fn: () => unknown) => fn()
  }
})

jest.mock('@tensorflow/tfjs-backend-wasm', () => ({ setWasmPaths: jest.fn() }))

jest.mock('../../src/offscreen/classifiers/BinaryClassifier', () => ({
  BinaryClassifier: jest.fn(() => makeClassifier('ViT_NSFW_384'))
}))

jest.mock('../../src/offscreen/classifiers/NsfwjsClassifier', () => ({
  NsfwjsClassifier: jest.fn(() => makeClassifier('MobileNet_v1.2'))
}))

type Listener = (
  message: OffscreenRequest,
  sender: unknown,
  sendResponse: (response: OffscreenClassifyResponse) => void
) => boolean | undefined

let listener: Listener
let consoleError: jest.SpyInstance

// jsdom's location.reload is non-configurable and non-writable, so it can't be
// mocked; it reports the navigation it won't perform through the virtual
// console instead. Count those.
const reloads = (): number => consoleError.mock.calls
  .filter(call => call.some(arg => String(arg).includes('Not implemented: navigation')))
  .length

// Load offscreen.ts fresh so its module-scope state (the op chain, the restart
// record it reads on start) belongs to this test alone.
const loadOffscreen = (): void => {
  jest.isolateModules(() => { require('../../src/offscreen/offscreen') })
}

const send = (message: OffscreenRequest): Promise<OffscreenClassifyResponse> => {
  return new Promise(resolve => { listener(message, null, resolve) })
}

const classify = async (url: string): Promise<OffscreenClassifyResponse> => {
  return await send({ target: 'offscreen', type: 'CLASSIFY', url })
}

// SET_SETTINGS never answers, so drive the listener and let the timers run.
const setModel = (trainedModel: TrainedModel): void => {
  listener({ target: 'offscreen', type: 'SET_SETTINGS', filterStrictness: 55, logging: false, trainedModel }, null, () => undefined)
}

const savedRestartState = (): RestartState | null => {
  const saved = sessionStorage.getItem(RESTART_KEY)
  return saved === null ? null : JSON.parse(saved) as RestartState
}

describe('offscreen => model lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockRegistry.created = []
    mockRegistry.stuck = new Set()
    holding.clear()
    sessionStorage.clear()

    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    // jsdom never fires load for a src it cannot fetch, so hand the document an
    // image that is always ready.
    class ReadyImage {
      public crossOrigin = ''
      public onload: (() => void) | null = null
      public onerror: ((error: unknown) => void) | null = null
      public set src (_value: string) { setTimeout(() => this.onload?.(), 0) }
    }
    ;(global as unknown as { Image: unknown }).Image = ReadyImage

    ;(global as unknown as { chrome: unknown }).chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        onMessage: { addListener: (fn: Listener) => { listener = fn } }
      }
    }
  })

  afterEach(() => {
    jest.useRealTimers()
    consoleError.mockRestore()
  })

  it('Should dispose the model it replaces once its predictions have settled', async () => {
    loadOffscreen()

    const answer = classify('https://example.com/a.jpg')
    await jest.advanceTimersByTimeAsync(100)
    expect(await answer).toEqual({ result: false })

    setModel('MobileNet_v1.2')
    await jest.advanceTimersByTimeAsync(100)

    expect(mockRegistry.created.map(c => c.trainedModel)).toEqual(['ViT_NSFW_384', 'MobileNet_v1.2'])
    expect(mockRegistry.created[0].dispose).toHaveBeenCalled()
    expect(reloads()).toBe(0)
  })

  it('Should restart the realm rather than dispose a model still running a prediction', async () => {
    mockRegistry.stuck.add('https://example.com/stuck.jpg')
    loadOffscreen()

    const answer = classify('https://example.com/stuck.jpg')
    await jest.advanceTimersByTimeAsync(10000)
    expect(await answer).toEqual({ result: false, error: 'Prediction timed out after 10000ms' })

    setModel('MobileNet_v1.2')
    await jest.advanceTimersByTimeAsync(30000)

    expect(mockRegistry.created[0].dispose).not.toHaveBeenCalled()
    // The replacement must not load in a realm that is going away.
    expect(mockRegistry.created).toHaveLength(1)
    expect(reloads()).toBe(1)
    expect(savedRestartState()).toEqual({
      filterStrictness: 55,
      trainedModel: 'MobileNet_v1.2',
      logging: false
    })
  })

  it('Should tell a classification queued behind the restart that the realm is going away', async () => {
    mockRegistry.stuck.add('https://example.com/stuck.jpg')
    loadOffscreen()

    const stuck = classify('https://example.com/stuck.jpg')
    await jest.advanceTimersByTimeAsync(10000)
    await stuck

    setModel('MobileNet_v1.2')
    // Queued while the switch is still waiting, so it reaches the chain after the
    // restart rather than being admitted afterwards.
    const answer = classify('https://example.com/next.jpg')
    await jest.advanceTimersByTimeAsync(30100)
    expect(await answer).toEqual({ result: false, error: RESTARTING_MESSAGE })
  })

  it('Should dispose a model whose prediction settles after its own timeout', async () => {
    mockRegistry.stuck.add('https://example.com/slow.jpg')
    loadOffscreen()

    const stuck = classify('https://example.com/slow.jpg')
    await jest.advanceTimersByTimeAsync(10000)
    expect(await stuck).toEqual({ result: false, error: 'Prediction timed out after 10000ms' })

    setModel('MobileNet_v1.2')
    await jest.advanceTimersByTimeAsync(5000)
    // The image was slow, not lost: the model goes quiet inside the disposal wait.
    mockRegistry.settle('https://example.com/slow.jpg')
    await jest.advanceTimersByTimeAsync(100)

    expect(reloads()).toBe(0)
    expect(mockRegistry.created[0].dispose).toHaveBeenCalled()
    expect(mockRegistry.created.map(c => c.trainedModel)).toEqual(['ViT_NSFW_384', 'MobileNet_v1.2'])
  })

  it('Should wait on an older prediction still running behind a settled newer one', async () => {
    mockRegistry.stuck.add('https://example.com/stuck.jpg')
    loadOffscreen()

    const stuck = classify('https://example.com/stuck.jpg')
    await jest.advanceTimersByTimeAsync(10000)
    await stuck

    // A second image answers normally on the same model. Tracking only the newest
    // prediction would read that as the model being idle.
    const next = classify('https://example.com/next.jpg')
    await jest.advanceTimersByTimeAsync(100)
    expect(await next).toEqual({ result: false })

    setModel('MobileNet_v1.2')
    await jest.advanceTimersByTimeAsync(30100)

    expect(mockRegistry.created[0].dispose).not.toHaveBeenCalled()
    expect(reloads()).toBe(1)
  })
})
