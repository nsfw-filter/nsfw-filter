// The offscreen document fetches each image a second time to read its pixels. That
// fetch used to get one second, a Manifest V2 number from when two loads shared the
// queue. Anything slower came back as "no verdict", which the background reports as
// `false` and the page treats as safe -- so on a slow connection images went
// unfiltered. Ask the offscreen document directly, where a failure is still
// distinguishable from a real verdict.

const SETTLE_TIMEOUT = 40000

const classify = async (url) => {
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
  test('classifies an image the server is slow to answer for', async () => {
    expect(await classify(`${global.__BASE_URL__}slow-icon.png`)).toEqual({ result: false })
  }, SETTLE_TIMEOUT)

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
