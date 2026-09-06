/**
 * @jest-environment jsdom
 */
import { BackgroundImageFilter } from '../../src/content/Filter/BackgroundImageFilter'

const IMAGE = 'http://example.com/a.jpg'

type Intersect = (element: HTMLElement, isIntersecting: boolean) => void

// One observer per filter; the test drives intersections by hand.
const stubIntersectionObserver = (): { intersect: Intersect } => {
  let callback: IntersectionObserverCallback = () => {}

  class Stub {
    constructor (handler: IntersectionObserverCallback) { callback = handler }
    observe (): void {}
    unobserve (): void {}
    disconnect (): void {}
  }

  ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = Stub

  return {
    intersect: (element, isIntersecting) => callback(
      [{ target: element, isIntersecting } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
  }
}

// chrome.runtime.sendMessage, with each verdict held until the test releases it.
const stubRuntime = (): { release: (result: boolean) => void, sent: () => number } => {
  const pending: Array<(result: boolean) => void> = []

  ;(global as unknown as { chrome: unknown }).chrome = {
    runtime: {
      lastError: undefined,
      sendMessage: (message: { url: string }, respond: (response: unknown) => void) => {
        pending.push(result => respond({ result, url: message.url }))
      }
    }
  }

  return {
    release: (result: boolean) => pending.shift()?.(result),
    sent: () => pending.length
  }
}

const makeElement = (style = `background-image: url("${IMAGE}")`): HTMLElement => {
  const element = document.createElement('div')
  element.setAttribute('style', style)
  element.getBoundingClientRect = () => ({ width: 200, height: 200 } as DOMRect)
  document.body.appendChild(element)

  return element
}

// Rechecks are coalesced into a task of their own, so draining the timer queue is
// part of settling.
const flush = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0))
  await Promise.resolve()
}

afterEach(() => {
  // A failing test must not leave fake timers behind for the next one.
  jest.useRealTimers()
  document.body.innerHTML = ''
})

describe('content => BackgroundImageFilter', () => {
  test('removes the background while it is being classified', () => {
    stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()

    new BackgroundImageFilter().observe(element)
    intersect(element, true)

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('processing')
    expect(element.style.getPropertyValue('background-image')).toBe('none')
  })

  test('puts a safe background back exactly as the page wrote it', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()

    new BackgroundImageFilter().observe(element)
    intersect(element, true)
    runtime.release(false)
    await flush()

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('sfw')
    expect(element.style.getPropertyValue('background-image')).toBe(`url("${IMAGE}")`)
    expect(element.style.getPropertyPriority('background-image')).toBe('')
  })

  test('leaves an unsafe background removed', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()

    new BackgroundImageFilter().observe(element)
    intersect(element, true)
    runtime.release(true)
    await flush()

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('nsfw')
    expect(element.style.getPropertyValue('background-image')).toBe('none')
  })

  // The element itself must stay untouched: its text is the page's, not ours.
  test('never hides the element carrying the background', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    element.textContent = 'card text'

    new BackgroundImageFilter().observe(element)
    intersect(element, true)
    runtime.release(true)
    await flush()

    expect(element.style.visibility).toBe('')
    expect(element.style.filter).toBe('')
    expect(element.hidden).toBe(false)
  })

  test('ignores an element with no background image', () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement('width: 200px')

    new BackgroundImageFilter().observe(element)
    intersect(element, true)

    expect(element.dataset.nsfwFilterBackgroundStatus).toBeUndefined()
    expect(runtime.sent()).toBe(0)
  })

  test('leaves an element smaller than the minimum alone', () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    element.getBoundingClientRect = () => ({ width: 20, height: 20 } as DOMRect)

    new BackgroundImageFilter().observe(element)
    intersect(element, true)

    expect(element.dataset.nsfwFilterBackgroundStatus).toBeUndefined()
    expect(runtime.sent()).toBe(0)
  })

  // A recycled list row shows another item's background before the first verdict
  // lands. The verdict belongs to footage this element no longer shows.
  test('drops a verdict for a background the element has replaced', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    // Our own write is tracked until the observer has seen it, so the page's write
    // has to come from a later task to count as the page's.
    await Promise.resolve()
    element.setAttribute('style', 'background-image: url("http://example.com/b.jpg")')
    filter.checkStyleMutation(element)
    await flush()
    runtime.release(true)
    await flush()

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('processing')
  })

  // Nothing downstream is guaranteed to answer. A background the page owns is
  // not ours to keep off the screen.
  test('restores the background when the background worker never answers', async () => {
    jest.useFakeTimers()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { intersect } = stubIntersectionObserver()
    ;(global as unknown as { chrome: unknown }).chrome = {
      runtime: {
        lastError: { message: 'Could not establish connection' },
        sendMessage: (_message: unknown, respond: (response: unknown) => void) => respond(undefined)
      }
    }
    const element = makeElement()

    new BackgroundImageFilter().observe(element)
    intersect(element, true)
    await jest.advanceTimersByTimeAsync(5000)

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('sfw')
    expect(element.style.getPropertyValue('background-image')).toBe(`url("${IMAGE}")`)
  })

  test('restores every background it removed when filtering is turned off', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    runtime.release(true)
    await flush()
    filter.stop()
    filter.revealAll()

    expect(element.dataset.nsfwFilterBackgroundStatus).toBeUndefined()
    expect(element.style.getPropertyValue('background-image')).toBe(`url("${IMAGE}")`)
  })
})

describe('content => BackgroundImageFilter => lifecycle', () => {
  // Observing an element again is a no-op, so turning filtering back on produces
  // no intersection for anything already on screen.
  test('re-reads what is on screen when filtering resumes', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    runtime.release(false)
    await flush()
    filter.stop()
    filter.revealAll()
    filter.start()
    await flush()

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('processing')
    expect(element.style.getPropertyValue('background-image')).toBe('none')
  })

  // The verdict for a detached element is dropped, so nothing else would clear
  // the override it is carrying when it comes back.
  test('restores a removed element still waiting for a verdict', async () => {
    stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    element.remove()
    filter.release(element)

    expect(element.dataset.nsfwFilterBackgroundStatus).toBeUndefined()
    expect(element.style.getPropertyValue('background-image')).toBe(`url("${IMAGE}")`)
  })

  test('classifies a reinserted element again', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    element.remove()
    filter.release(element)
    document.body.appendChild(element)
    filter.observe(element)
    intersect(element, true)

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('processing')

    runtime.release(false)
    await flush()

    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('sfw')
    expect(element.style.getPropertyValue('background-image')).toBe(`url("${IMAGE}")`)
  })

  // The url lives in a custom property, so swapping it leaves our override in
  // place: an intact override is no proof the write was ours.
  test('re-reads a background swapped through a custom property', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    runtime.release(true)
    await flush()
    await Promise.resolve()

    const read = jest.spyOn(window, 'getComputedStyle')
    element.style.setProperty('--photo', 'nothing')
    filter.checkStyleMutation(element)
    await flush()

    expect(read).toHaveBeenCalledWith(element)
    read.mockRestore()
  })

  // Our own hide reaches the observer as a style mutation like any other.
  test('does not re-read its own write', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    filter.checkStyleMutation(element)
    await flush()

    expect(runtime.sent()).toBe(1)
  })

  // Moving a card under a different parent can select a different background
  // without touching its class or its style.
  test('classifies a moved element against its new parent', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    runtime.release(false)
    await flush()

    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    wrapper.appendChild(element)
    filter.release(element)
    filter.observe(element)
    await flush()

    expect(runtime.sent()).toBe(1)
    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('processing')
  })
})

describe('content => BackgroundImageFilter => rechecks', () => {
  // A page observing its own DOM can answer our override with a background of its
  // own, in the same batch of mutations. Only the first of those is ours.
  test('examines a page write that follows its own', async () => {
    stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)

    const read = jest.spyOn(window, 'getComputedStyle')
    filter.checkStyleMutation(element)
    filter.checkStyleMutation(element)
    await flush()

    expect(read).toHaveBeenCalledWith(element)
    read.mockRestore()
  })

  // A recheck restores the declaration and puts the override back, which is more
  // than one write to it. Crediting one leaves the rest looking like the page,
  // and the filter chasing its own writes for the life of the tab.
  test('settles instead of chasing the writes a recheck makes', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)
    runtime.release(true)
    await flush()
    expect(element.dataset.nsfwFilterBackgroundStatus).toBe('nsfw')

    let records = 0
    const observer = new MutationObserver(list => {
      records += list.length
      list.forEach(() => filter.checkStyleMutation(element))
    })
    observer.observe(element, { attributes: true, attributeFilter: ['style'] })

    filter.recheckVisible()
    await flush()
    await flush()
    const settled = records

    await flush()
    await flush()
    observer.disconnect()

    expect(records).toBe(settled)
  })

  // `.card[style]` is a selector like any other: an empty attribute left behind
  // is a background of its own.
  test('leaves no style attribute behind on an element that had none', async () => {
    const runtime = stubRuntime()
    const { intersect } = stubIntersectionObserver()

    const element = document.createElement('div')
    element.getBoundingClientRect = () => ({ width: 200, height: 200 } as DOMRect)
    document.body.appendChild(element)
    const read = jest.spyOn(window, 'getComputedStyle')
      .mockImplementation(() => ({ backgroundImage: `url("${IMAGE}")` }) as unknown as CSSStyleDeclaration)

    const filter = new BackgroundImageFilter()
    filter.observe(element)
    intersect(element, true)
    expect(element.style.getPropertyValue('background-image')).toBe('none')

    runtime.release(false)
    await flush()
    read.mockRestore()

    expect(element.hasAttribute('style')).toBe(false)
  })

  // A short body still paints its background across the whole viewport.
  test('classifies a body background whatever box the body has', () => {
    stubRuntime()
    const { intersect } = stubIntersectionObserver()
    document.body.setAttribute('style', `background-image: url("${IMAGE}")`)
    document.body.getBoundingClientRect = () => ({ width: 1000, height: 8 } as DOMRect)

    const filter = new BackgroundImageFilter()
    filter.observe(document.body)
    intersect(document.body, true)

    expect(document.body.dataset.nsfwFilterBackgroundStatus).toBe('processing')
    document.body.removeAttribute('style')
    delete document.body.dataset.nsfwFilterBackgroundStatus
  })

  // `.selected + .card` puts the affected element beside the changed one.
  test('re-reads a visible sibling of a changed element', async () => {
    stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const sibling = makeElement('width: 200px')
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(document.body)
    intersect(element, true)
    await flush()

    const read = jest.spyOn(window, 'getComputedStyle')
    filter.checkElement(sibling)
    await flush()

    expect(read).toHaveBeenCalledWith(element)
    read.mockRestore()
  })

  // Crossing a breakpoint swaps the background with nothing else changing.
  test('re-reads what is on screen after a resize', async () => {
    jest.useFakeTimers()
    stubRuntime()
    const { intersect } = stubIntersectionObserver()
    const element = makeElement()
    const filter = new BackgroundImageFilter()

    filter.observe(element)
    intersect(element, true)

    const read = jest.spyOn(window, 'getComputedStyle')
    window.dispatchEvent(new Event('resize'))
    await jest.advanceTimersByTimeAsync(500)

    expect(read).toHaveBeenCalledWith(element)
    read.mockRestore()
  })
})
