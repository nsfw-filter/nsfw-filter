// CSS background images. They carry no <img> element, so nothing in the image
// path sees them: discovery has to come from computed style. The fixture uses
// the extension's own icon, which keeps the verdict independent of the network.

const SETTLE_TIMEOUT = 60000

const settled = async (page, id) => await page.waitForFunction((id) => {
  const status = document.getElementById(id).getAttribute('data-nsfw-filter-background-status')
  return status !== null && status !== 'processing'
}, { timeout: SETTLE_TIMEOUT, polling: 250 }, id)

const read = async (page, id) => await page.evaluate((id) => {
  const element = document.getElementById(id)
  return {
    status: element.getAttribute('data-nsfw-filter-background-status'),
    backgroundImage: getComputedStyle(element).backgroundImage,
    textVisibility: getComputedStyle(element).visibility
  }
}, id)

// A verdict already sitting on the element satisfies settled(), so a re-judgement
// is only observable as a fresh trip back through processing.
const recordStatuses = async (page, id) => await page.evaluate((id) => {
  window.__bgStatuses = []
  const element = document.getElementById(id)
  new MutationObserver(() => window.__bgStatuses.push(
    element.getAttribute('data-nsfw-filter-background-status')
  )).observe(element, { attributes: true, attributeFilter: ['data-nsfw-filter-background-status'] })
}, id)

const reprocessed = async (page) => await page.waitForFunction(() =>
  window.__bgStatuses.includes('processing'),
{ timeout: SETTLE_TIMEOUT, polling: 250 })

describe('CSS background images', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()
    await page.goto(`${global.__BASE_URL__}background.html`, { waitUntil: 'load' })
    await settled(page, 'sheet')
    await settled(page, 'inline')
  }, SETTLE_TIMEOUT)

  afterAll(async () => {
    await page.close()
  })

  test('classifies a background applied by a stylesheet and restores it', async () => {
    const sheet = await read(page, 'sheet')
    expect(sheet.status).toBe('sfw')
    expect(sheet.backgroundImage).toContain('icon.png')
    // The whole stack comes back, not just the layer that was classified.
    expect(sheet.backgroundImage).toContain('gradient')
  })

  test('classifies a background applied inline and restores the declaration', async () => {
    const inline = await read(page, 'inline')
    expect(inline.status).toBe('sfw')
    expect(inline.backgroundImage).toContain('icon.png')
    expect(await page.evaluate(() =>
      document.getElementById('inline').style.getPropertyValue('background-image')
    )).toContain('icon.png')
  })

  // Hiding a background must never hide the element: its text belongs to the page.
  test('leaves the element and its text visible throughout', async () => {
    for (const id of ['sheet', 'inline']) {
      expect((await read(page, id)).textVisibility).toBe('visible')
    }
  })

  test('ignores an element with no background image', async () => {
    const plain = await read(page, 'plain')
    expect(plain.status).toBeNull()
  })

  // A virtualized list swaps the class and the same element shows different
  // footage. The new background has to be judged on its own.
  test('re-judges a background the page swaps out', async () => {
    await recordStatuses(page, 'sheet')
    await page.evaluate(() => {
      document.getElementById('sheet').className = 'card-revised'
    })
    await reprocessed(page)
    await page.waitForFunction(() =>
      getComputedStyle(document.getElementById('sheet')).backgroundImage.includes('revision=2'),
    { timeout: SETTLE_TIMEOUT, polling: 250 })
    await settled(page, 'sheet')

    const sheet = await read(page, 'sheet')
    expect(sheet.status).toBe('sfw')
    expect(sheet.backgroundImage).toContain('revision=2')
  })

  // A stylesheet arriving after load changes no attribute and moves nothing into
  // the viewport, so nothing else would prompt a look at what it brings. Filling
  // it in afterwards is how a framework usually gets there.
  test('classifies a background introduced by a late stylesheet', async () => {
    await page.evaluate(() => {
      window.__sheet = document.head.appendChild(document.createElement('style'))
    })
    await page.evaluate(() => {
      window.__sheet.textContent =
        '#plain { width: 128px; height: 128px; background-image: url("/icon.png?late=1") }'
    })
    await settled(page, 'plain')

    const plain = await read(page, 'plain')
    expect(plain.status).toBe('sfw')
    expect(plain.backgroundImage).toContain('late=1')
  })

  // The verdict for a detached element is dropped, so a removed card must not come
  // back still carrying the override it was hidden with.
  test('restores and re-judges a card removed while it was being classified', async () => {
    await page.evaluate(() => {
      const card = document.getElementById('inline')
      window.__parked = card
      card.remove()
    })
    await page.waitForFunction(() =>
      window.__parked.getAttribute('data-nsfw-filter-background-status') === null &&
      window.__parked.style.getPropertyValue('background-image') !== 'none',
    { timeout: SETTLE_TIMEOUT, polling: 250 })

    await page.evaluate(() => document.body.appendChild(window.__parked))
    await settled(page, 'inline')

    const inline = await read(page, 'inline')
    expect(inline.status).toBe('sfw')
    expect(inline.backgroundImage).toContain('icon.png')
  })

  test('leaves no background stuck missing or unprocessed', async () => {
    const leftovers = await page.evaluate(() =>
      [...document.querySelectorAll('[data-nsfw-filter-background-status]')].filter(element => {
        const status = element.getAttribute('data-nsfw-filter-background-status')
        return status === 'processing' || getComputedStyle(element).backgroundImage === 'none'
      }).length
    )
    expect(leftovers).toBe(0)
  })
})
