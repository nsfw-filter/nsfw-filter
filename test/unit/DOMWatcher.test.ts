/**
 * @jest-environment jsdom
 */
import { DOMWatcher } from '../../src/content/DOMWatcher/DOMWatcher'
import { IImageFilter, ImageFilter } from '../../src/content/Filter/ImageFilter'

const flushMutations = async (): Promise<void> => await Promise.resolve()

const makeFilter = (): IImageFilter => ({
  analyzeImage: jest.fn(),
  setSettings: jest.fn(),
  revealImage: jest.fn(),
  checkStyleMutation: jest.fn()
})

afterEach(() => { document.body.innerHTML = '' })

describe('content => DOMWatcher => watch', () => {
  test('checks images already in the DOM when watching starts', () => {
    document.body.innerHTML = '<img id="a"><img id="b">'
    const filter = makeFilter()

    new DOMWatcher(filter).watch()

    expect(filter.analyzeImage).toHaveBeenCalledTimes(2)
    expect(filter.analyzeImage).toHaveBeenCalledWith(document.getElementById('a'), false)
    expect(filter.analyzeImage).toHaveBeenCalledWith(document.getElementById('b'), false)
  })

  test('checks images added after watching starts', async () => {
    const filter = makeFilter()
    new DOMWatcher(filter).watch()

    document.body.appendChild(document.createElement('img'))
    await flushMutations()

    expect(filter.analyzeImage).toHaveBeenCalledTimes(1)
  })

  test('reanalyzes an image when its src attribute changes', async () => {
    document.body.innerHTML = '<img id="a">'
    const filter = makeFilter()
    new DOMWatcher(filter).watch();
    (filter.analyzeImage as jest.Mock).mockClear()

    document.getElementById('a')!.setAttribute('src', 'http://example.com/a.jpg')
    await flushMutations()

    expect(filter.analyzeImage).toHaveBeenCalledWith(document.getElementById('a'), true)
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
    new DOMWatcher(filter).watch()

    image.setAttribute('style', 'visibility: visible')
    await flushMutations()

    expect(image.style.visibility).toBe('hidden')
  })
})
