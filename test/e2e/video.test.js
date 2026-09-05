// <video> support. The fixture is grey frames recorded by the browser itself
// (fixtures/make-video.js), so these prove the plumbing: discovery, frame
// capture, and that every video reaches a terminal status. Blocking unsafe
// footage needs unsafe footage and is covered by the unit tests.

const SETTLE_TIMEOUT = 60000

// A verdict on a frame is only observable as the status going through
// 'processing': a video with nothing decoded yet is left alone, not classified.
const recordStatuses = async (page) => await page.evaluateOnNewDocument(() => {
  window.__nsfwStatuses = []
  new MutationObserver(records => {
    for (const { target } of records) {
      if (target.tagName !== 'VIDEO') continue
      window.__nsfwStatuses.push(`${target.id}:${target.getAttribute('data-nsfw-filter-status')}`)
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-nsfw-filter-status'] })
})

const settled = async (page) => {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('video')].every(video => {
      const status = video.getAttribute('data-nsfw-filter-status')
      return status !== null && status !== 'processing'
    }),
  { timeout: SETTLE_TIMEOUT, polling: 250 })
}

const read = async (page, id) => await page.evaluate((id) => {
  const video = document.getElementById(id)
  return {
    status: video.getAttribute('data-nsfw-filter-status'),
    visibility: getComputedStyle(video).visibility
  }
}, id)

const statuses = async (page, id) =>
  await page.evaluate((id) => window.__nsfwStatuses.filter(entry => entry.startsWith(`${id}:`)), id)

// One frame is classified at a time per page, so a video waits behind every
// other video before its own verdict comes back.
const classified = async (page, id) => await page.waitForFunction(
  (id) => window.__nsfwStatuses.includes(`${id}:processing`),
  { timeout: SETTLE_TIMEOUT, polling: 250 },
  id
)

const waitForStatus = async (page, id, status) => await page.waitForFunction(
  (id, status) => document.getElementById(id).getAttribute('data-nsfw-filter-status') === status,
  { timeout: SETTLE_TIMEOUT, polling: 250 },
  id, status
)

describe('Videos on the page', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()
    // Sampling skips a hidden document, and a background tab is hidden.
    await page.bringToFront()
    await recordStatuses(page)
    await page.goto(`${global.__BASE_URL__}video.html`, { waitUntil: 'load' })
    // Muted playback is what a real video does and what makes frames decode.
    await page.evaluate(async () => {
      await Promise.all(
        [...document.querySelectorAll('video')].map(async video => await video.play().catch(() => undefined))
      )
    })
    await settled(page)
  }, SETTLE_TIMEOUT)

  afterAll(async () => {
    await page.close()
  })

  test('classifies a video from a sampled frame', async () => {
    await classified(page, 'plain')
    const plain = await read(page, 'plain')

    expect(plain.status).toBe('sfw')
    expect(plain.visibility).toBe('visible')
  })

  test('settles a video that has a poster', async () => {
    await classified(page, 'postered')
    const postered = await read(page, 'postered')
    expect(postered.status).toBe('sfw')
    expect(postered.visibility).toBe('visible')
  })

  test('tags a video below MIN_VIDEO_SIZE without classifying it', async () => {
    const tiny = await read(page, 'tiny')
    expect(tiny.status).toBe('sfw')
    expect(tiny.visibility).toBe('visible')
    expect(await statuses(page, 'tiny')).not.toContain('tiny:processing')
  })

  // A cross-origin video without CORS plays but cannot be read back. Leaving it
  // hidden would blank video the browser is willing to show.
  test('reveals a video whose frames cannot be read', async () => {
    await waitForStatus(page, 'foreign', 'unavailable')
    const foreign = await read(page, 'foreign')
    expect(foreign.status).toBe('unavailable')
    expect(foreign.visibility).toBe('visible')
  })

  test('picks up and classifies a video added after load', async () => {
    await page.evaluate((base) => {
      const video = document.createElement('video')
      video.id = 'added'
      video.src = `${base}video.webm`
      video.width = 320
      video.height = 240
      video.muted = true
      video.playsInline = true
      document.body.appendChild(video)
      video.play().catch(() => undefined)
    }, global.__BASE_URL__)

    await classified(page, 'added')
    await settled(page)

    const added = await read(page, 'added')
    expect(added.status).toBe('sfw')
    expect(added.visibility).toBe('visible')
  })

  test('leaves no video stuck hidden or unprocessed', async () => {
    const leftovers = await page.evaluate(() =>
      [...document.querySelectorAll('video')].filter(video => {
        const status = video.getAttribute('data-nsfw-filter-status')
        return status === null || status === 'processing' || getComputedStyle(video).visibility === 'hidden'
      }).length
    )
    expect(leftovers).toBe(0)
  })
})
