// Every other e2e test launches Chrome with software WebGL, so the WASM backend
// the offscreen document falls back to on a machine with no usable GPU was never
// exercised. That path used to wedge: bringing the backend up never settled, the
// serialised op chain stayed blocked behind it, and the content script left every
// image tagged `processing` and hidden by its own inline style. Launch a browser
// with GL off and prove the page still settles.

// WASM inference is much slower than WebGL, so allow more time to settle than the
// WebGL tests need before calling it a hang. Deliberately shorter than the content
// script's 60s analysis deadline: if the page only settled because that deadline
// fired, the images were revealed unclassified and this should still fail.
const SETTLE_TIMEOUT = 40000

// Set by the offscreen document when it drops a realm it can't run the model in.
const RESTART_KEY = 'nsfw-filter-restart'

describe('No usable GPU', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER_NO_GPU__.newPage()
    await page.goto(global.__BASE_URL__, { waitUntil: 'domcontentloaded' })
  }, SETTLE_TIMEOUT)

  afterAll(async () => {
    await page.close()
  })

  // Guards the guard: without this the suite would silently pass on WebGL if a
  // future Chrome ignored the flags, testing nothing.
  test('runs without WebGL, so the model has to load on WASM', async () => {
    const webgl = await page.evaluate(() =>
      document.createElement('canvas').getContext('webgl') !== null
    )
    expect(webgl).toBe(false)
  })

  test('settles every image instead of leaving the page blank', async () => {
    await page.waitForFunction(() =>
      [...document.images].every(image => {
        const status = image.getAttribute('data-nsfw-filter-status')
        return status !== null && status !== 'processing'
      }),
    { timeout: SETTLE_TIMEOUT, polling: 500 })

    const hidden = await page.evaluate(() =>
      [...document.images].filter(image => getComputedStyle(image).visibility === 'hidden').length
    )
    expect(hidden).toBe(0)
  })

  // The offscreen document reaches WASM by restarting itself, not by switching the
  // live tfjs engine. Read its sessionStorage to prove the restart happened and
  // that the document came back up rather than reloading in a loop.
  test('gets to WASM by restarting the offscreen document once', async () => {
    const offscreen = global.__BROWSER_NO_GPU__.targets()
      .find(target => target.url().endsWith('/src/offscreen.html'))
    expect(offscreen).toBeDefined()

    const session = await offscreen.createCDPSession()
    const { result } = await session.send('Runtime.evaluate', {
      expression: `sessionStorage.getItem('${RESTART_KEY}')`,
      returnByValue: true
    })
    await session.detach()

    expect(result.value).not.toBeNull()
  })
})
