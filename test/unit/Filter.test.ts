/**
 * @jest-environment jsdom
 */
import { ImageFilter } from '../../src/content/Filter/ImageFilter'

// An image is hidden from the moment it is queued until a verdict comes back, so a
// request nothing answers used to leave it hidden for the life of the page. That is
// what a wedged backend looks like from here: the message is delivered, the
// callback never fires. These cover the deadline that reveals the image anyway.

const ANALYSIS_DEADLINE = 60000

type StubRuntime = { lastError?: { message: string }, sendMessage: unknown }

const installRuntime = (runtime: StubRuntime): void => {
  (global as unknown as { chrome: unknown }).chrome = { runtime }
}

// chrome.runtime is a singleton, so lastError is read off whichever stub is
// installed now, not the one that sent the message.
const installedRuntime = (): StubRuntime =>
  (global as unknown as { chrome: { runtime: StubRuntime } }).chrome.runtime

// chrome.runtime.sendMessage, with the reply held back until a test releases it.
const stubRuntime = (): {
  reply: (response: unknown) => void
  replyWithError: () => void
  sent: () => number
} => {
  let callback: ((response: unknown) => void) | undefined
  let sent = 0

  const runtime: StubRuntime = {
    lastError: undefined,
    sendMessage: (_message: unknown, respond: (response: unknown) => void) => {
      sent++
      callback = respond
    }
  }

  installRuntime(runtime)

  return {
    reply: (response: unknown) => callback?.(response),
    replyWithError: () => {
      const installed = installedRuntime()
      installed.lastError = { message: 'Could not establish connection' }
      callback?.(undefined)
      installed.lastError = undefined
    },
    sent: () => sent
  }
}

// The same stub, but every send comes back as a runtime error: a torn-down service
// worker, seen from the content script.
const stubUnreachableRuntime = (): { sent: () => number } => {
  let sent = 0

  const runtime: StubRuntime = {
    lastError: { message: 'Could not establish connection' },
    sendMessage: (_message: unknown, respond: (response: unknown) => void) => {
      sent++
      respond(undefined)
    }
  }

  installRuntime(runtime)

  return { sent: () => sent }
}

const makeImage = (src = 'http://example.com/a.jpg'): HTMLImageElement => {
  const image = document.createElement('img')
  image.src = src
  image.width = 200
  image.height = 200
  document.body.appendChild(image)

  return image
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
  document.body.innerHTML = ''
})

describe('content => Filter => analysis deadline', () => {
  test('reveals an image the background never answers for', async () => {
    stubRuntime()
    const image = makeImage()

    new ImageFilter().analyzeImage(image)
    expect(image.dataset.nsfwFilterStatus).toBe('processing')
    expect(image.style.visibility).toBe('hidden')

    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)

    expect(image.dataset.nsfwFilterStatus).toBe('sfw')
    expect(image.style.visibility).toBe('visible')
  })

  test('keeps the image hidden until the deadline is actually reached', async () => {
    stubRuntime()
    const image = makeImage()

    new ImageFilter().analyzeImage(image)
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE - 1000)

    expect(image.dataset.nsfwFilterStatus).toBe('processing')
    expect(image.style.visibility).toBe('hidden')
  })

  test('does not reveal an image the background answered in time', async () => {
    const { reply } = stubRuntime()
    const image = makeImage()

    new ImageFilter().analyzeImage(image)
    reply({ result: true, url: image.src })
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)

    expect(image.dataset.nsfwFilterStatus).toBe('nsfw')
  })

  // A reply that lands after we gave up must not resolve a second time, and must
  // not blow up on a queue entry that is already gone.
  test('ignores a reply that arrives after the deadline', async () => {
    const { reply } = stubRuntime()
    const image = makeImage()

    new ImageFilter().analyzeImage(image)
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)
    reply({ result: true, url: image.src })
    await jest.advanceTimersByTimeAsync(0)

    expect(image.dataset.nsfwFilterStatus).toBe('sfw')
    expect(image.style.visibility).toBe('visible')
  })

  // Two <img> elements sharing a src are deduplicated onto one request, so the
  // deadline has to settle every waiter, not just the first.
  test('reveals every image waiting on the same url', async () => {
    stubRuntime()
    const first = makeImage()
    const second = makeImage()
    const filter = new ImageFilter()

    filter.analyzeImage(first)
    filter.analyzeImage(second)
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)

    expect(first.style.visibility).toBe('visible')
    expect(second.style.visibility).toBe('visible')
  })

  // Giving up on an unreachable worker settles every waiter and stops retrying.
  test('reveals every image when the background worker never comes back', async () => {
    const { sent } = stubUnreachableRuntime()
    const first = makeImage()
    const second = makeImage()
    const filter = new ImageFilter()

    filter.analyzeImage(first)
    filter.analyzeImage(second)
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)

    expect(first.style.visibility).toBe('visible')
    expect(second.style.visibility).toBe('visible')
    expect(sent()).toBe(6)
  })

  // A sendMessage callback can't be cancelled, so the runtime error for a request
  // we gave up on still arrives. It must not restart the retry loop.
  test('does not retry a request that already timed out', async () => {
    const runtime = stubRuntime()
    const image = makeImage()

    new ImageFilter().analyzeImage(image)
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)
    runtime.replyWithError()
    await jest.advanceTimersByTimeAsync(5000)

    expect(runtime.sent()).toBe(1)
    expect(image.style.visibility).toBe('visible')
  })

  // The runtime error for an abandoned request arrives while the same url is queued
  // again. It must not retry or settle on behalf of the new request.
  test('drops a late runtime error belonging to an abandoned request', async () => {
    const first = stubRuntime()
    const image = makeImage()
    const filter = new ImageFilter()

    filter.analyzeImage(image)
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)

    const second = stubRuntime()
    const requeued = makeImage()
    filter.analyzeImage(requeued)
    first.replyWithError()
    await jest.advanceTimersByTimeAsync(5000)

    expect(requeued.dataset.nsfwFilterStatus).toBe('processing')
    expect(second.sent()).toBe(1)
  })

  // A url that timed out can be queued again by a later image. The reply to the
  // abandoned request must not settle that new request.
  test('drops a late reply belonging to an abandoned request', async () => {
    const first = stubRuntime()
    const image = makeImage()
    const filter = new ImageFilter()

    filter.analyzeImage(image)
    await jest.advanceTimersByTimeAsync(ANALYSIS_DEADLINE)

    const second = stubRuntime()
    const requeued = makeImage()
    filter.analyzeImage(requeued)
    first.reply({ result: true, url: requeued.src })
    await jest.advanceTimersByTimeAsync(0)

    expect(requeued.dataset.nsfwFilterStatus).toBe('processing')
    expect(second.sent()).toBe(1)
  })
})
