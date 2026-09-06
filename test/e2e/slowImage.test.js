// The offscreen document fetches each image a second time to read its pixels. That
// fetch used to get one second, a Manifest V2 number from when two loads shared the
// queue. Anything slower came back as "no verdict", which the background reports as
// `false` and the page treats as safe -- so on a slow connection images went
// unfiltered. Ask the offscreen document directly, where a failure is still
// distinguishable from a real verdict.

const SETTLE_TIMEOUT = 40000

// The offscreen document answers this and then reloads itself onto WASM, taking
// every classification in flight with it. `OffscreenModel` sends those again; this
// test speaks to the document directly, so it has to do the same.
const RESTARTING = 'Restarting the offscreen document on WASM'

const sleep = async (ms) => await new Promise(resolve => setTimeout(resolve, ms))

const classify = async (url) => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await sendClassify(url)
    // No response at all means the reload already closed the port.
    if (response !== undefined && response.error !== RESTARTING) return response
    await sleep(1000)
  }

  throw new Error('The offscreen document never came back from its restart')
}

const sendClassify = async (url) => {
  const worker = await global.__BROWSER__.waitForTarget(
    target => target.type() === 'service_worker',
    { timeout: SETTLE_TIMEOUT }
  )
  const session = await worker.createCDPSession()
  const { result } = await session.send('Runtime.evaluate', {
    expression: `new Promise(resolve => chrome.runtime.sendMessage(
      { target: 'offscreen', type: 'CLASSIFY', url: '${url}' },
      resolve
    ))`,
    awaitPromise: true,
    returnByValue: true
  })
  await session.detach()

  return result.value
}

describe('Slow images', () => {
  // Long enough to cover a restart onto WASM, where the model has to load again
  // before anything can be classified.
  test('classifies an image the server is slow to answer for', async () => {
    expect(await classify(`${global.__BASE_URL__}slow-icon.png`)).toEqual({ result: false })
  }, 90000)

  // Guards the test above: if the fixture ever served instantly, it would pass
  // without exercising anything.
  test('serves that image slower than a local file', async () => {
    const page = await global.__BROWSER__.newPage()
    try {
      const started = Date.now()
      await page.goto(`${global.__BASE_URL__}slow-icon.png`, { waitUntil: 'load' })
      expect(Date.now() - started).toBeGreaterThan(1000)
    } finally {
      await page.close()
    }
  }, SETTLE_TIMEOUT)
})
