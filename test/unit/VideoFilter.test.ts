/**
 * @jest-environment jsdom
 */
import { VideoFilter } from '../../src/content/Filter/VideoFilter'

// A video is judged from frames it has already decoded, which means the parts
// worth pinning down are the ones a browser makes hard to reach: what gets
// sampled, what happens when the frame cannot be read back, and what a verdict
// for footage the element no longer shows is allowed to do.

type Sent = { url: string, source?: string }

// chrome.runtime.sendMessage, answering every request from `verdict`.
const stubRuntime = (verdict: (sent: Sent) => boolean = () => false): {
  sent: Sent[]
  hold: () => void
  release: (which?: (sent: Sent) => boolean) => void
} => {
  const sent: Sent[] = []
  let held: Array<{ message: Sent, answer: () => void }> = []
  let holding = false

  const sendMessage = (message: Sent, respond: (response: unknown) => void): void => {
    sent.push(message)
    const answer = (): void => respond({ result: verdict(message), url: message.url })
    if (holding) held.push({ message, answer })
    else answer()
  }

  ;(global as unknown as { chrome: unknown }).chrome = {
    runtime: { lastError: undefined, sendMessage }
  }

  return {
    sent,
    hold: () => { holding = true },
    // Replies can be let through out of order: a frame and a poster for the same
    // element are two requests racing each other.
    release: (which = () => true) => {
      const releasing = held.filter(({ message }) => which(message))
      held = held.filter(({ message }) => !which(message))
      if (held.length === 0) holding = false
      for (const { answer } of releasing) answer()
    }
  }
}

let intersect: (video: HTMLVideoElement, isIntersecting: boolean) => void

const stubIntersectionObserver = (): void => {
  class Stub {
    private readonly observed: Set<Element>

    constructor (private readonly callback: IntersectionObserverCallback) {
      this.observed = new Set()
      intersect = (video, isIntersecting) => {
        if (!this.observed.has(video)) return
        this.callback([{ target: video, isIntersecting } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
    }

    observe (element: Element): void { this.observed.add(element) }
    unobserve (element: Element): void { this.observed.delete(element) }
    disconnect (): void { this.observed.clear() }
  }

  ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = Stub
}

const FRAME = 'data:image/jpeg;base64,frame'

// jsdom has no 2d context, so every capture has to be answered here. 'taint' is
// what a cross-origin frame does: drawing works, reading the pixels back throws.
const nativeCreateElement = document.createElement.bind(document)

const stubCanvas = (mode: 'frame' | 'taint' | 'none' = 'frame'): void => {
  jest.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
    const element = nativeCreateElement(tag, options)
    if (tag !== 'canvas') return element

    Object.defineProperty(element, 'getContext', {
      value: () => mode === 'none' ? null : { drawImage: () => undefined }
    })
    Object.defineProperty(element, 'toDataURL', {
      value: () => {
        if (mode === 'taint') throw new Error('SecurityError')
        return FRAME
      }
    })

    return element
  })
}

const makeVideo = ({ size = 320, poster = '', playing = true } = {}): HTMLVideoElement => {
  const video = document.createElement('video')
  video.src = 'http://example.com/clip.webm'
  if (poster !== '') video.poster = poster
  document.body.appendChild(video)

  Object.defineProperty(video, 'clientWidth', { value: size, configurable: true })
  Object.defineProperty(video, 'clientHeight', { value: size, configurable: true })
  Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
  Object.defineProperty(video, 'currentTime', { value: 0, writable: true, configurable: true })
  Object.defineProperty(video, 'paused', { value: !playing, writable: true, configurable: true })
  // Whether the poster is still what the element shows.
  Object.defineProperty(video, 'played', { value: { length: playing ? 1 : 0 }, writable: true, configurable: true })
  Object.defineProperty(video, 'pause', {
    value: () => { Object.defineProperty(video, 'paused', { value: true, writable: true, configurable: true }) },
    configurable: true
  })

  return video
}

// Let the sampling chain run: capture, request, verdict.
const settle = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

const watch = (filter: VideoFilter, video: HTMLVideoElement): void => {
  filter.analyzeVideo(video, false)
  intersect(video, true)
}

beforeEach(() => {
  stubIntersectionObserver()
  stubCanvas()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('content => VideoFilter', () => {
  test('samples a playing video and reveals it when the frame is safe', async () => {
    const { sent } = stubRuntime(() => false)
    const video = makeVideo()

    watch(new VideoFilter(), video)
    await settle()

    expect(sent).toHaveLength(1)
    expect(sent[0].source).toBe(FRAME)
    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
    expect(video.style.visibility).toBe('visible')
  })

  // The frame is the payload, not the identity: a data url used as a key would be
  // cached and logged as one.
  test('sends the frame under a key of its own', async () => {
    const { sent } = stubRuntime()
    watch(new VideoFilter(), makeVideo())
    await settle()

    expect(sent[0].url).toMatch(/^nsfw-filter-frame:\d+-\d+$/)
  })

  test('blocks and pauses a video whose frame is unsafe', async () => {
    stubRuntime(() => true)
    const video = makeVideo()
    const filter = new VideoFilter()
    filter.setSettings({ filterEffect: 'blur' })

    watch(filter, video)
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBe('nsfw')
    expect(video.style.filter).toBe('blur(25px)')
    expect(video.paused).toBe(true)
    expect(filter.getBlockAmount()).toBe(1)
  })

  // A page that keeps calling play() on blocked footage gets it back paused.
  test('re-pauses a blocked video the page starts again', async () => {
    stubRuntime(() => true)
    const video = makeVideo()

    watch(new VideoFilter(), video)
    await settle()

    Object.defineProperty(video, 'paused', { value: false, writable: true, configurable: true })
    video.dispatchEvent(new Event('play'))

    expect(video.paused).toBe(true)
  })

  // Cross-origin footage the browser will play but not let us read. Leaving it
  // hidden would blank video the page is entitled to show.
  test('reveals a video whose frames cannot be read back', async () => {
    stubCanvas('taint')
    const { sent } = stubRuntime()
    const video = makeVideo()

    watch(new VideoFilter(), video)
    await settle()

    expect(sent).toHaveLength(0)
    expect(video.dataset.nsfwFilterStatus).toBe('unavailable')
    expect(video.style.visibility).toBe('visible')
  })

  test('stops sampling a video it cannot read', async () => {
    stubCanvas('taint')
    const filter = new VideoFilter()
    const video = makeVideo()

    watch(filter, video)
    await settle()
    video.dispatchEvent(new Event('seeked'))
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBe('unavailable')
  })

  test('classifies a poster before playback starts', async () => {
    const { sent } = stubRuntime(() => true)
    const video = makeVideo({ poster: 'http://example.com/poster.jpg', playing: false })

    watch(new VideoFilter(), video)
    await settle()

    expect(sent[0].url).toBe('http://example.com/poster.jpg')
    expect(video.dataset.nsfwFilterStatus).toBe('nsfw')
  })

  test('leaves a video below the size threshold alone', async () => {
    const { sent } = stubRuntime()
    const video = makeVideo({ size: 40 })

    watch(new VideoFilter(), video)
    await settle()

    expect(sent).toHaveLength(0)
    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
  })

  // The element switched media while a frame was in flight. That verdict is about
  // footage nobody is showing any more.
  test('drops a verdict for media the element no longer plays', async () => {
    const runtime = stubRuntime(() => true)
    const video = makeVideo()

    watch(new VideoFilter(), video)
    runtime.hold()
    await settle()

    // New media, nothing decoded from it yet, so nothing re-samples on its own.
    Object.defineProperty(video, 'paused', { value: true, writable: true, configurable: true })
    Object.defineProperty(video, 'readyState', { value: 0, configurable: true })
    video.dispatchEvent(new Event('loadstart'))
    runtime.release()
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
    expect(video.style.visibility).toBe('visible')
  })

  // New media still has to end up with a status, or the stylesheet that hides
  // unjudged videos keeps hiding it.
  test('judges a video again when its media changes', async () => {
    stubRuntime()
    const video = makeVideo({ poster: 'http://example.com/poster.jpg', playing: false })

    watch(new VideoFilter(), video)
    await settle()
    video.dispatchEvent(new Event('loadstart'))
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
    expect(video.style.visibility).toBe('visible')
  })

  // A frame is the stronger evidence and can land first. The poster reply that
  // follows must not clear it.
  test('does not let a safe poster clear a frame that was blocked', async () => {
    const runtime = stubRuntime(sent => sent.source !== undefined)
    const video = makeVideo({ poster: 'http://example.com/poster.jpg' })

    runtime.hold()
    watch(new VideoFilter(), video)
    await settle()

    runtime.release(sent => sent.source !== undefined)
    await settle()
    expect(video.dataset.nsfwFilterStatus).toBe('nsfw')

    runtime.release()
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBe('nsfw')
    expect(video.paused).toBe(true)
  })

  // A paused video still shows its first decoded frame.
  test('samples a paused video that already has a frame', async () => {
    const { sent } = stubRuntime()
    const video = makeVideo({ playing: false })

    watch(new VideoFilter(), video)
    await settle()

    expect(sent).toHaveLength(1)
    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
  })

  // A busy page fires timeupdate and rescans subtrees constantly. Neither is a
  // reason to reclassify footage that has not moved on.
  test('does not resample cleared footage until the media moves on', async () => {
    const runtime = stubRuntime()
    const video = makeVideo()
    const filter = new VideoFilter()

    watch(filter, video)
    await settle()

    video.dispatchEvent(new Event('timeupdate'))
    filter.analyzeVideo(video, false)
    await settle()
    expect(runtime.sent).toHaveLength(1)

    Object.defineProperty(video, 'currentTime', { value: 11, writable: true, configurable: true })
    video.dispatchEvent(new Event('timeupdate'))
    await settle()

    expect(runtime.sent).toHaveLength(2)
  })

  // Filtering can be switched off while a frame is in flight. Blocking after that
  // would hide and pause a video on a page the filter is no longer running on.
  test('drops a verdict that lands after filtering is turned off', async () => {
    const runtime = stubRuntime(() => true)
    const video = makeVideo()
    const filter = new VideoFilter()

    runtime.hold()
    watch(filter, video)
    await settle()

    filter.stop()
    filter.revealAll()
    runtime.release()
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBeUndefined()
    expect(video.style.visibility).toBe('visible')
    expect(video.paused).toBe(false)
  })

  test('does not sample a video that left the document', async () => {
    const runtime = stubRuntime()
    const video = makeVideo()
    const filter = new VideoFilter()

    filter.analyzeVideo(video, false)
    video.remove()
    intersect(video, true)
    await settle()

    expect(runtime.sent).toHaveLength(0)
  })

  test('stops sampling a video the user unhid', async () => {
    const runtime = stubRuntime(() => true)
    const video = makeVideo()
    const filter = new VideoFilter()

    watch(filter, video)
    await settle()
    filter.revealVideo(video)
    video.dispatchEvent(new Event('seeked'))
    await settle()

    expect(runtime.sent).toHaveLength(1)
    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
    expect(video.style.visibility).toBe('visible')
  })

  // Filtering off, then on again: the same elements have to start being sampled
  // again without the page reloading.
  test('resumes sampling after filtering is turned off and on', async () => {
    const runtime = stubRuntime()
    const video = makeVideo()
    const filter = new VideoFilter()

    watch(filter, video)
    await settle()

    filter.stop()
    filter.revealAll()
    video.dispatchEvent(new Event('seeked'))
    await settle()
    expect(runtime.sent).toHaveLength(1)

    filter.start()
    video.dispatchEvent(new Event('seeked'))
    await settle()
    expect(runtime.sent).toHaveLength(2)
  })

  // A frame verdict says nothing about a video that has never played: the poster
  // is still the whole of what is on screen.
  test('judges a poster swapped in before the video has played', async () => {
    const runtime = stubRuntime(() => false)
    const video = makeVideo({ playing: false })
    const filter = new VideoFilter()

    watch(filter, video)
    await settle()

    video.poster = 'http://example.com/swapped.jpg'
    filter.checkPoster(video)
    await settle()

    expect(runtime.sent).toHaveLength(2)
    expect(runtime.sent[1].url).toBe('http://example.com/swapped.jpg')
  })

  test('ignores a poster swapped in once the video has played', async () => {
    const runtime = stubRuntime(() => false)
    const video = makeVideo()
    const filter = new VideoFilter()

    watch(filter, video)
    await settle()

    video.poster = 'http://example.com/swapped.jpg'
    filter.checkPoster(video)
    await settle()

    expect(runtime.sent).toHaveLength(1)
    expect(video.style.visibility).toBe('visible')
  })

  // Turning filtering off retires the user's unhide with everything else. Keeping
  // it would discard the verdict for a video re-enabling has just hidden.
  test('judges a video the user unhid once filtering is turned off and on', async () => {
    const runtime = stubRuntime(() => false)
    const video = makeVideo({ poster: 'http://example.com/poster.jpg', playing: false })
    const filter = new VideoFilter()

    watch(filter, video)
    await settle()
    filter.revealVideo(video)

    filter.stop()
    filter.revealAll()
    filter.start()
    filter.analyzeVideo(video, false)
    await settle()

    expect(runtime.sent.filter(({ url }) => url.endsWith('poster.jpg'))).toHaveLength(2)
    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
    expect(video.style.visibility).toBe('visible')
  })

  // The poster is the only thing on screen for a video with nothing decoded, so
  // dropping it drops the reason the element is hidden. Its reply is discarded
  // as stale, which leaves nothing else to settle the hide.
  test('settles a video whose poster is removed while it is being judged', async () => {
    const runtime = stubRuntime()
    runtime.hold()
    const filter = new VideoFilter()
    const video = makeVideo({ poster: 'http://example.com/poster.jpg', playing: false })
    Object.defineProperty(video, 'readyState', { value: 0, configurable: true })
    watch(filter, video)
    expect(video.dataset.nsfwFilterStatus).toBe('processing')

    video.removeAttribute('poster')
    filter.checkPoster(video)
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBe('sfw')
    expect(video.style.visibility).toBe('visible')
  })

  // A poster and a frame are two requests racing. A frame that cannot be read
  // must not put a video the poster already blocked back on screen.
  test('does not let an unreadable frame clear a blocked poster', async () => {
    stubCanvas('taint')
    stubRuntime(sent => sent.source === undefined)
    const filter = new VideoFilter()
    const video = makeVideo({ poster: 'http://example.com/poster.jpg' })

    watch(filter, video)
    await settle()

    expect(video.dataset.nsfwFilterStatus).toBe('nsfw')
  })

  // Unobserving is permanent, so a feed that recycles the element by taking it
  // out and putting it back has to be observed again or it is never sampled.
  test('samples a video the page removed and reinserted', async () => {
    const runtime = stubRuntime()
    const filter = new VideoFilter()
    const video = makeVideo()

    watch(filter, video)
    await settle()
    const before = runtime.sent.length

    video.remove()
    intersect(video, false)
    document.body.appendChild(video)
    // Past the sampling interval, so only re-observation decides the outcome.
    Object.defineProperty(video, 'currentTime', { value: 20, writable: true, configurable: true })
    watch(filter, video)
    await settle()

    expect(runtime.sent.length).toBeGreaterThan(before)
  })

  // A background tab is not sampled, and a paused video in one gives no further
  // media events. Coming back to the tab is the only thing left to act on.
  test('samples a video discovered while the tab was in the background', async () => {
    const runtime = stubRuntime()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    const filter = new VideoFilter()
    const video = makeVideo({ playing: false })

    watch(filter, video)
    await settle()
    expect(runtime.sent).toHaveLength(0)

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()

    expect(runtime.sent).toHaveLength(1)
  })

  // Frames are captured one at a time, so a queued video can scroll away before
  // its turn. Capturing it anyway costs the slot a visible video needs.
  test('drops a queued video that left the viewport before its turn', async () => {
    const runtime = stubRuntime()
    runtime.hold()
    const filter = new VideoFilter()
    const first = makeVideo()
    const second = makeVideo()

    watch(filter, first)
    watch(filter, second)
    intersect(second, false)
    runtime.release()
    await settle()

    expect(runtime.sent).toHaveLength(1)
  })
})
