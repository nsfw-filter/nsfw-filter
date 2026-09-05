// Every other e2e test launches Chrome with software WebGL, so the WASM fallback
// was never exercised. That path used to wedge: the backend never came up, the
// serialised op chain stayed blocked behind it, and every image stayed tagged
// `processing` and hidden. Launch a browser with GL off and prove it settles.

// WASM inference is much slower than WebGL, so allow more time before calling it a
// hang. Deliberately shorter than the content script's 60s analysis deadline: a
// page that only settled because the deadline fired must still fail here.
const SETTLE_TIMEOUT = 40000

// Set by the offscreen document when it drops a realm it can't run the model in.
const RESTART_KEY = 'nsfw-filter-restart'

const serviceWorker = async () =>
  await global.__BROWSER_NO_GPU__.waitForTarget(
    target => target.type() === 'service_worker',
    { timeout: SETTLE_TIMEOUT }
  )

const evaluateIn = async (target, expression) => {
  const session = await target.createCDPSession()
  const { result } = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  await session.detach()

  return result.value
}

describe('No usable GPU', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER_NO_GPU__.newPage()
    await page.goto(global.__BASE_URL__, { waitUntil: 'domcontentloaded' })
  }, SETTLE_TIMEOUT)

  afterAll(async () => {
    await page.close()
  })

  // Without this the suite would silently pass on WebGL, testing nothing, if a
  // future Chrome ignored the flags.
  test('runs without WebGL, so the model has to load on WASM', async () => {
    const webgl = await page.evaluate(() =>
      document.createElement('canvas').getContext('webgl') !== null
    )
    expect(webgl).toBe(false)
  })

  test('settles every image instead of leaving the page blank', async () => {
    // Without an image on the page the settle check below is vacuously true.
    expect(await page.evaluate(() => document.images.length)).toBeGreaterThan(0)

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

  // The offscreen document reaches WASM by restarting itself, carrying its settings
  // through sessionStorage (restartState.test.ts covers that round-trip). A single
  // `reload` navigation proves it restarted once rather than looping through the
  // same failure.
  test('gets to WASM by restarting the offscreen document', async () => {
    const offscreen = global.__BROWSER_NO_GPU__.targets()
      .find(target => target.url().endsWith('/src/offscreen.html'))
    expect(offscreen).toBeDefined()

    const restart = JSON.parse(
      await evaluateIn(offscreen, `sessionStorage.getItem('${RESTART_KEY}')`)
    )
    const navigations = await evaluateIn(
      offscreen,
      "performance.getEntriesByType('navigation').map(entry => entry.type)"
    )

    expect(restart).toEqual({
      filterStrictness: expect.any(Number),
      trainedModel: expect.any(String),
      logging: expect.any(Boolean)
    })
    expect(navigations).toEqual(['reload'])
  })

  // The background reports a failed prediction as `false`, the same verdict this
  // fixture expects, so a settled page can't tell inference from failing open. Ask
  // the offscreen document directly and require an error-free answer.
  test('classifies on WASM instead of failing open', async () => {
    const response = await evaluateIn(
      await serviceWorker(),
      `new Promise(resolve => chrome.runtime.sendMessage(
        { target: 'offscreen', type: 'CLASSIFY', url: '${global.__BASE_URL__}icon.png' },
        resolve
      ))`
    )

    expect(response).toEqual({ result: false })
  })
})
