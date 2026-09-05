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

  test('re-applies grayscale whose filter the page cleared (grayscale mode)', () => {
    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'grayscale' })
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.filter = ''

    filter.checkStyleMutation(image)

    expect(image.style.filter).toBe('grayscale(1)')
  })

  test('keeps an in-flight image hidden rather than revealing it (blur mode)', () => {
    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'blur' })
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'processing'
    image.style.visibility = 'visible'

    filter.checkStyleMutation(image)

    expect(image.style.visibility).toBe('hidden')
    expect(image.style.filter).not.toContain('blur')
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

// Live filterEffect changes must re-render already-blocked images without
// re-running classification (the verdict hasn't changed, only its presentation).
describe('content => ImageFilter => applyEffectToBlocked', () => {
  afterEach(() => { document.body.innerHTML = '' })

  test('re-renders blocked images from blur to grayscale', () => {
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.filter = 'blur(25px)'
    document.body.appendChild(image)

    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'grayscale' })
    filter.applyEffectToBlocked()

    expect(image.style.filter).toBe('grayscale(1)')
  })

  test('leaves sfw images untouched', () => {
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'sfw'
    image.style.filter = ''
    document.body.appendChild(image)

    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'grayscale' })
    filter.applyEffectToBlocked()

    expect(image.style.filter).toBe('')
  })
})

// Pausing the extension or allow-listing the site mid-page must bring already
// blocked images back, and clear their status so re-enabling reclassifies them.
describe('content => ImageFilter => revealAll', () => {
  afterEach(() => { document.body.innerHTML = '' })

  test('reveals every blocked image and clears its status', () => {
    const image = makeImage(200, 200)
    image.dataset.nsfwFilterStatus = 'nsfw'
    image.style.filter = 'blur(25px)'
    image.style.visibility = 'hidden'
    document.body.appendChild(image)

    new ImageFilter().revealAll()

    expect(image.style.filter).toBe('')
    expect(image.style.visibility).toBe('visible')
    expect(image.dataset.nsfwFilterStatus).toBeUndefined()
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
    document.body.appendChild(image)
    image.dataset.nsfwFilterStatus = 'nsfw'

    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'hide' })
    filter.applyEffectToBlocked()
    expect(image.hidden).toBe(true)

    filter.revealImage(image)

    expect(image.hidden).toBe(false)
    expect(image.dataset.nsfwFilterStatus).toBe('sfw')

    image.remove()
  })

  // The page can reparent an image between hiding it and the verdict landing.
  // Clearing `hidden` only for what is still a BODY child left it hidden forever.
  test('unhides an image the page moved after it was hidden', () => {
    const image = makeImage(200, 200)
    document.body.appendChild(image)
    image.dataset.nsfwFilterStatus = 'nsfw'

    const filter = new ImageFilter()
    filter.setSettings({ filterEffect: 'hide' })
    filter.applyEffectToBlocked()

    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    wrapper.appendChild(image)

    filter.revealImage(image)

    expect(image.hidden).toBe(false)
    expect(image.style.visibility).toBe('visible')

    wrapper.remove()
  })
})

// A verdict can come back for a src the element no longer has, or for a page the
// user has since asked us to leave alone. Applying it then hides an image nothing
// will reveal again.
describe('content => ImageFilter => late verdicts', () => {
  const stubRuntime = (): { release: (result: boolean) => void } => {
    const pending: Array<(result: boolean) => void> = []

    ;(global as unknown as { chrome: unknown }).chrome = {
      runtime: {
        lastError: undefined,
        sendMessage: (message: { url: string }, respond: (response: unknown) => void) => {
          pending.push(result => respond({ result, url: message.url }))
        }
      }
    }

    // Oldest first, so a verdict can be answered while a newer request is out.
    return { release: (result: boolean) => pending.shift()?.(result) }
  }

  const settle = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve() }

  afterEach(() => { document.body.innerHTML = '' })

  test('does not hide an image whose src changed while it was being classified', async () => {
    const runtime = stubRuntime()
    const image = makeImage(200, 200)
    document.body.appendChild(image)
    const filter = new ImageFilter()

    filter.analyzeImage(image)
    image.src = 'http://example.com/b.jpg'
    filter.analyzeImage(image, true)
    runtime.release(true)
    await settle()

    expect(image.dataset.nsfwFilterStatus).toBe('processing')
  })

  test('does not hide an image after filtering was turned off', async () => {
    const runtime = stubRuntime()
    const image = makeImage(200, 200)
    document.body.appendChild(image)
    const filter = new ImageFilter()

    filter.analyzeImage(image)
    filter.revealAll()
    runtime.release(true)
    await settle()

    expect(image.dataset.nsfwFilterStatus).toBeUndefined()
    expect(image.style.visibility).toBe('visible')
  })

  test('does not hide an image the user unhid while it was being classified', async () => {
    const runtime = stubRuntime()
    const image = makeImage(200, 200)
    document.body.appendChild(image)
    const filter = new ImageFilter()

    filter.analyzeImage(image)
    filter.revealImage(image)
    runtime.release(true)
    await settle()

    expect(image.dataset.nsfwFilterStatus).toBe('sfw')
    expect(image.style.visibility).toBe('visible')
  })

  // An image the page reparents while its verdict is out still carries the hidden
  // attribute we set, and its new parent is no longer BODY.
  test('unhides a safe image the page moved while it was being classified', async () => {
    const runtime = stubRuntime()
    const image = makeImage(200, 200)
    document.body.appendChild(image)
    const filter = new ImageFilter()

    filter.analyzeImage(image)
    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    wrapper.appendChild(image)
    runtime.release(false)
    await settle()

    expect(image.dataset.nsfwFilterStatus).toBe('sfw')
    expect(image.hidden).toBe(false)
    expect(image.style.visibility).toBe('visible')
  })
})
