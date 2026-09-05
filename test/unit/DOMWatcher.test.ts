/**
 * @jest-environment jsdom
 */
import { DOMWatcher } from '../../src/content/DOMWatcher/DOMWatcher'
import { IBackgroundImageFilter } from '../../src/content/Filter/BackgroundImageFilter'
import { IImageFilter, ImageFilter } from '../../src/content/Filter/ImageFilter'

const flushMutations = async (): Promise<void> => await Promise.resolve()

const makeFilter = (): IImageFilter => ({
  analyzeImage: jest.fn(),
  setSettings: jest.fn(),
  revealImage: jest.fn(),
  checkStyleMutation: jest.fn()
})

const makeBackgroundFilter = (): IBackgroundImageFilter => ({
  observe: jest.fn(),
  release: jest.fn(),
  recheckVisible: jest.fn(),
  checkElement: jest.fn(),
  checkStyleMutation: jest.fn(),
  applyEffectToBlocked: jest.fn(),
  revealAll: jest.fn(),
  start: jest.fn(),
  stop: jest.fn()
})

afterEach(() => { document.body.innerHTML = '' })

describe('content => DOMWatcher => watch', () => {
  test('checks images already in the DOM when watching starts', () => {
    document.body.innerHTML = '<img id="a"><img id="b">'
    const filter = makeFilter()

    new DOMWatcher(filter, makeBackgroundFilter()).watch()

    expect(filter.analyzeImage).toHaveBeenCalledTimes(2)
    expect(filter.analyzeImage).toHaveBeenCalledWith(document.getElementById('a'), false)
    expect(filter.analyzeImage).toHaveBeenCalledWith(document.getElementById('b'), false)
  })

  test('checks images added after watching starts', async () => {
    const filter = makeFilter()
    new DOMWatcher(filter, makeBackgroundFilter()).watch()

    document.body.appendChild(document.createElement('img'))
    await flushMutations()

    expect(filter.analyzeImage).toHaveBeenCalledTimes(1)
  })

  test('reanalyzes an image when its src attribute changes', async () => {
    document.body.innerHTML = '<img id="a">'
    const filter = makeFilter()
    new DOMWatcher(filter, makeBackgroundFilter()).watch();
    (filter.analyzeImage as jest.Mock).mockClear()

    document.getElementById('a')!.setAttribute('src', 'http://example.com/a.jpg')
    await flushMutations()

    expect(filter.analyzeImage).toHaveBeenCalledWith(document.getElementById('a'), true)
  })
})

// Live enable/disable and allowlist toggles have to start and stop watching on
// an already-open page without a reload, so watch() must be idempotent and
// unwatch() must stop reporting future mutations.
describe('content => DOMWatcher => start/stop live', () => {
  test('sweeps existing images once even if watch() is called twice', () => {
    document.body.innerHTML = '<img id="a">'
    const filter = makeFilter()

    const watcher = new DOMWatcher(filter, makeBackgroundFilter())
    watcher.watch()
    watcher.watch()

    expect(filter.analyzeImage).toHaveBeenCalledTimes(1)
  })

  test('unwatch stops reacting to later mutations', async () => {
    const filter = makeFilter()
    const watcher = new DOMWatcher(filter, makeBackgroundFilter())
    watcher.watch()
    watcher.unwatch();
    (filter.analyzeImage as jest.Mock).mockClear()

    document.body.appendChild(document.createElement('img'))
    await flushMutations()

    expect(filter.analyzeImage).not.toHaveBeenCalled()
  })
})

// Instagram (and Google) rewrite an image's inline style on every re-render,
// wiping the effect we applied so the blocked image reappears. The observer has
// to react to style changes, not just src, and re-apply the effect. Issue #244.
describe('content => DOMWatcher => style rewrites (issue #244)', () => {
  test('re-hides a blocked image after the page rewrites its style attribute', async () => {
    document.body.innerHTML = '<img id="a" src="http://example.com/a.jpg" width="200" height="200">'
    const image = document.getElementById('a') as HTMLImageElement
    // Already classified nsfw and hidden, so the initial sweep skips it and no
    // background prediction is needed for this test.
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.visibility = 'hidden'

    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'hide' })
    new DOMWatcher(filter, makeBackgroundFilter()).watch()

    image.setAttribute('style', 'visibility: visible')
    await flushMutations()

    expect(image.style.visibility).toBe('hidden')
  })
})

// A background can be selected by what is around an element rather than by the
// element itself, so what changed is not always what has to be re-read.
describe('content => DOMWatcher => cascade changes', () => {
  test('re-reads the parent of an inserted sibling', async () => {
    document.body.innerHTML = '<div id="list"><div id="card"></div></div>'
    const background = makeBackgroundFilter()
    new DOMWatcher(makeFilter(), background).watch()

    document.getElementById('list')?.prepend(document.createElement('div'))
    await flushMutations()

    expect(background.checkElement).toHaveBeenCalledWith(document.getElementById('list'))
  })

  test('re-reads what is on screen when a stylesheet is removed', async () => {
    document.body.innerHTML = '<style id="sheet"></style>'
    const background = makeBackgroundFilter()
    new DOMWatcher(makeFilter(), background).watch()
    ;(background.recheckVisible as jest.Mock).mockClear()

    document.getElementById('sheet')?.remove()
    await flushMutations()

    expect(background.recheckVisible).toHaveBeenCalled()
  })
})

describe('content => DOMWatcher => stylesheet registrations', () => {
  test('re-reads what is on screen when a wrapper holding a stylesheet is removed', async () => {
    document.body.innerHTML = '<div id="wrapper"><style></style></div>'
    const background = makeBackgroundFilter()
    new DOMWatcher(makeFilter(), background).watch()
    ;(background.recheckVisible as jest.Mock).mockClear()

    document.getElementById('wrapper')?.remove()
    await flushMutations()

    expect(background.recheckVisible).toHaveBeenCalled()
  })

  test('re-reads what is on screen when an id change brings in a new rule', async () => {
    document.body.innerHTML = '<div id="card"></div>'
    const background = makeBackgroundFilter()
    new DOMWatcher(makeFilter(), background).watch()

    const card = document.getElementById('card') as HTMLElement
    card.id = 'other'
    await flushMutations()

    expect(background.checkElement).toHaveBeenCalledWith(card)
  })

  // Each <style> carries its own observer, so a pause that left them running
  // would keep answering for a filter that is meant to be idle.
  test('stops watching stylesheets when watching stops', async () => {
    document.body.innerHTML = '<style id="sheet"></style>'
    const background = makeBackgroundFilter()
    const watcher = new DOMWatcher(makeFilter(), background)
    watcher.watch()
    watcher.unwatch()
    ;(background.recheckVisible as jest.Mock).mockClear()

    const sheet = document.getElementById('sheet') as HTMLElement
    sheet.textContent = '.card { background-image: url("http://example.com/a.jpg") }'
    await flushMutations()

    expect(background.recheckVisible).not.toHaveBeenCalled()
  })
})
