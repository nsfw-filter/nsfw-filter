/**
 * @jest-environment jsdom
 */
import { DOMWatcher } from '../../src/content/DOMWatcher/DOMWatcher'
import { IImageFilter } from '../../src/content/Filter/ImageFilter'

const flushMutations = async (): Promise<void> => await Promise.resolve()

const makeFilter = (): IImageFilter => ({
  analyzeImage: jest.fn(),
  setSettings: jest.fn()
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
