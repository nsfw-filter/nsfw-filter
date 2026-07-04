/**
 * @jest-environment jsdom
 */
import { ImageFilter } from '../../src/content/Filter/ImageFilter'

// analyzeImage decides whether an image is a filtering candidate and tags it.
// _analyzeImage (which talks to the background) is stubbed so these tests cover
// only that decision and the data-nsfw-filter-status tagging the pending-hide
// stylesheet depends on.
const stubAnalyze = (): jest.SpyInstance =>
  jest.spyOn(ImageFilter.prototype as any, '_analyzeImage').mockImplementation(() => undefined)

const makeImage = (width: number, height: number, src = 'http://example.com/a.jpg'): HTMLImageElement => {
  const image = document.createElement('img')
  if (src.length > 0) image.src = src
  image.width = width
  image.height = height
  return image
}

afterEach(() => jest.restoreAllMocks())

describe('content => ImageFilter => analyzeImage', () => {
  test('processes an image larger than MIN_IMAGE_SIZE', () => {
    const spy = stubAnalyze()
    const image = makeImage(200, 200)

    new ImageFilter().analyzeImage(image)

    expect(image.dataset.nsfwFilterStatus).toBe('processing')
    expect(spy).toHaveBeenCalledWith(image)
  })

  test('treats a not-yet-laid-out image (0x0) as a candidate', () => {
    const spy = stubAnalyze()
    const image = makeImage(0, 0)

    new ImageFilter().analyzeImage(image)

    expect(image.dataset.nsfwFilterStatus).toBe('processing')
    expect(spy).toHaveBeenCalled()
  })

  test('tags a small image sfw without processing it', () => {
    const spy = stubAnalyze()
    const image = makeImage(20, 20)

    new ImageFilter().analyzeImage(image)

    expect(image.dataset.nsfwFilterStatus).toBe('sfw')
    expect(spy).not.toHaveBeenCalled()
  })

  test('treats MIN_IMAGE_SIZE itself as too small', () => {
    const spy = stubAnalyze()
    const image = makeImage(41, 41)

    new ImageFilter().analyzeImage(image)

    expect(image.dataset.nsfwFilterStatus).toBe('sfw')
    expect(spy).not.toHaveBeenCalled()
  })

  test('skips an image with no src and leaves it untagged', () => {
    const spy = stubAnalyze()
    const image = makeImage(200, 200, '')

    new ImageFilter().analyzeImage(image)

    expect(image.dataset.nsfwFilterStatus).toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
  })

  test('does not reprocess an already-tagged image', () => {
    const spy = stubAnalyze()
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'sfw'

    new ImageFilter().analyzeImage(image, false)

    expect(spy).not.toHaveBeenCalled()
  })

  test('reprocesses when the src attribute changed', () => {
    const spy = stubAnalyze()
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'sfw'

    new ImageFilter().analyzeImage(image, true)

    expect(image.dataset.nsfwFilterStatus).toBe('processing')
    expect(spy).toHaveBeenCalled()
  })

  test('does not relabel a blocked image that shrank below MIN_IMAGE_SIZE', () => {
    const spy = stubAnalyze()
    const image = makeImage(20, 20)
    image.dataset.nsfwFilterStatus = 'nsfw'

    new ImageFilter().analyzeImage(image, true)

    expect(image.dataset.nsfwFilterStatus).toBe('nsfw')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('content => ImageFilter => checkStyleMutation', () => {
  test('re-hides a blocked image whose visibility the page reset (hide mode)', () => {
    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'hide' })
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.visibility = 'visible'

    filter.checkStyleMutation(image)

    expect(image.style.visibility).toBe('hidden')
  })

  test('re-applies blur whose filter the page cleared (blur mode)', () => {
    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'blur' })
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.filter = ''

    filter.checkStyleMutation(image)

    expect(image.style.filter).toContain('blur')
  })

  test('restores full blur when the page downgrades it to a weak blur', () => {
    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'blur' })
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.filter = 'blur(1px)'

    filter.checkStyleMutation(image)

    expect(image.style.filter).toBe('blur(25px)')
  })

  test('leaves an sfw image untouched', () => {
    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'hide' })
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'sfw'
    image.style.visibility = 'visible'

    filter.checkStyleMutation(image)

    expect(image.style.visibility).toBe('visible')
  })

  test('does not rewrite the style when the effect is still intact', () => {
    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'hide' })
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.visibility = 'hidden'
    const spy = jest.spyOn(image.style, 'visibility', 'set')

    filter.checkStyleMutation(image)

    expect(spy).not.toHaveBeenCalled()
  })
})

describe('content => ImageFilter => revealImage', () => {
  test('clears a blurred image and retags it sfw', () => {
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.filter = 'blur(25px)'
    image.style.visibility = 'hidden'

    new ImageFilter().revealImage(image)

    expect(image.style.filter).toBe('')
    expect(image.style.visibility).toBe('visible')
    expect(image.dataset.nsfwFilterStatus).toBe('sfw')
  })

  test('unhides a BODY-child image blocked in hide mode', () => {
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.hidden = true
    document.body.appendChild(image)

    new ImageFilter().revealImage(image)

    expect(image.hidden).toBe(false)
    expect(image.dataset.nsfwFilterStatus).toBe('sfw')

    image.remove()
  })
})
