// Regression guard for the flash fix: an image present in the markup at
// document_start must be hidden, classified, and revealed by the content
// script's initial sweep. Served locally so the result is deterministic.
const SETTLE_TIMEOUT = 60000

describe('Static images present at load', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()
    await page.goto(global.__BASE_URL__, { waitUntil: 'domcontentloaded' })
    // The shared helper waits only on images already carrying a status, and an
    // empty set satisfies it at once: it cannot tell "nothing left to do" from
    // "registration has not started". This fixture knows which images it ships,
    // so wait for each of them to be registered as well as settled.
    await page.waitForFunction(() => document.images.length > 0 &&
      [...document.images].every(image => {
        const status = image.getAttribute('data-nsfw-filter-status')
        return status !== null && status !== 'processing'
      }), { timeout: SETTLE_TIMEOUT, polling: 250 })
  }, SETTLE_TIMEOUT)

  afterAll(async () => {
    await page.close()
  })

  const read = async (id) => await page.evaluate((id) => {
    const img = document.getElementById(id)
    return {
      status: img.getAttribute('data-nsfw-filter-status'),
      visibility: getComputedStyle(img).visibility
    }
  }, id)

  test('classifies a pre-existing SFW image and reveals it', async () => {
    const target = await read('target')
    expect(target.status).toBe('sfw')
    expect(target.visibility).toBe('visible')
  })

  test('tags an image below MIN_IMAGE_SIZE as sfw without hiding it', async () => {
    const tiny = await read('tiny')
    expect(tiny.status).toBe('sfw')
    expect(tiny.visibility).toBe('visible')
  })

  test('leaves no image stuck hidden or unprocessed', async () => {
    const leftovers = await page.evaluate(() =>
      [...document.images].filter(img => {
        const status = img.getAttribute('data-nsfw-filter-status')
        return status === null || status === 'processing' || getComputedStyle(img).visibility === 'hidden'
      }).length
    )
    expect(leftovers).toBe(0)
  })
})
