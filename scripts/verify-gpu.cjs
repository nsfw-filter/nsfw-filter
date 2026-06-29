/* Real-GPU smoke test for the built extension.
 *
 * The offscreen document classifies on the WebGL (GPU) backend, and some
 * failures only surface there: e.g. a minifier dropping tfjs's top-level flag
 * registrations makes the backend throw "Cannot evaluate flag ... no evaluation
 * function found" at module init. Headless swiftshader does not reproduce that
 * path, so this runs HEADED against the real GPU, attaches to every extension
 * target early, drives content -> service worker -> offscreen -> model, and
 * fails on any flag error or uncaught exception (not just on image status).
 *
 * Build first (`npm run build`), then `npm run verify:gpu`. Needs a display.
 * Override the browser binary with CHROME_BIN if puppeteer's default isn't
 * Chrome for Testing (a full Chrome that can load unpacked extensions).
 */
const http = require('http')
const path = require('path')
const puppeteer = require('puppeteer')

const EXT_PATH = path.join(__dirname, '..', 'dist')
const CHROME = process.env.CHROME_BIN || puppeteer.executablePath()

const flagErrors = []
const exceptions = []
const wasmFetches = []

async function attach (target) {
  try {
    const t = target.type()
    if (!['service_worker', 'other', 'page', 'background_page'].includes(t)) return
    const url = target.url() || ''
    const cdp = await target.createCDPSession()
    await cdp.send('Runtime.enable').catch(() => {})
    await cdp.send('Log.enable').catch(() => {})
    await cdp.send('Network.enable').catch(() => {})
    const tag = `${t}:${url.split('/').pop()}`
    const scan = (text) => {
      if (/no evaluation function found|Cannot evaluate flag|CPU_HANDOFF/i.test(text)) {
        flagErrors.push(`[${tag}] ${text}`)
      }
    }
    cdp.on('Runtime.consoleAPICalled', e => {
      scan((e.args || []).map(a => a.value ?? a.description ?? a.type).join(' '))
    })
    cdp.on('Runtime.exceptionThrown', e => {
      const text = e.exceptionDetails.exception?.description || e.exceptionDetails.text || ''
      exceptions.push(`[${tag}] ${text}`); scan(text)
    })
    cdp.on('Log.entryAdded', e => {
      const text = e.entry.text || ''
      if (e.entry.level === 'error') exceptions.push(`[${tag}] ${e.entry.source}: ${text}`)
      scan(text)
    })
    cdp.on('Network.requestWillBeSent', e => {
      if (/\.wasm(\?|$)/.test(e.request.url)) wasmFetches.push(e.request.url.split('/').pop())
    })
  } catch (_) {}
}

async function waitStatus (page, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const s = await page.evaluate(() => {
      const img = document.images[0]
      return img ? img.getAttribute('data-nsfw-filter-status') : null
    }).catch(() => null)
    if (s && s !== 'processing') return s
    await new Promise(r => setTimeout(r, 400))
  }
  return 'TIMEOUT'
}

;(async () => {
  const browser = await puppeteer.launch({
    headless: false, // real GPU: exercise the WebGL path
    executablePath: CHROME,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'
    ]
  })

  // Hook targets before the offscreen doc's module-init can throw unseen.
  browser.on('targetcreated', attach)
  for (const t of browser.targets()) await attach(t)

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<!doctype html><html><body></body></html>')
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const PAGE = `http://127.0.0.1:${server.address().port}/`

  const sw = await browser.waitForTarget(t => t.type() === 'service_worker', { timeout: 25000 }).catch(() => null)
  console.log('service worker:', sw ? 'OK' : 'NOT FOUND')

  // Poll for the offscreen doc rather than sampling once after a fixed sleep:
  // model warm-up and the backend fallback path can push spin-up past any single
  // guess, and a too-early probe reports a false NOT FOUND on slower machines.
  let offscreenUp = false
  for (let waited = 0; waited < 30000; waited += 500) {
    offscreenUp = browser.targets().some(t => /offscreen\.html/.test(t.url()))
    if (offscreenUp) break
    await new Promise(r => setTimeout(r, 500))
  }
  console.log('offscreen document:', offscreenUp ? 'OK' : 'NOT FOUND')

  // Drive the pipeline with a freshly-rendered, instant-loading raster image
  // (no network, so no load-timeout artifact).
  const results = []
  for (let i = 0; i < 3; i++) {
    const page = await browser.newPage()
    await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 1200))
    await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 300; c.height = 300
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#3344cc'; ctx.fillRect(0, 0, 300, 300)
      ctx.fillStyle = '#ffaa22'; ctx.fillRect(60, 60, 180, 180)
      const img = document.createElement('img')
      img.width = 300; img.height = 300; img.src = c.toDataURL('image/png')
      document.body.appendChild(img)
    })
    results.push(await waitStatus(page, 30000))
    await page.close()
  }

  const classified = results.every(s => s === 'sfw' || s === 'nsfw')
  console.log('backend:', wasmFetches.length ? 'WASM (CPU fallback)' : 'WebGL (GPU)')
  results.forEach((s, i) => console.log(`  image ${i + 1}: status=${s}`))
  console.log('flag errors:', flagErrors.join('\n  ') || '(none)')
  console.log('exceptions:', exceptions.join('\n  ') || '(none)')

  await browser.close()
  server.close()
  const ok = !!sw && offscreenUp && classified && flagErrors.length === 0 && exceptions.length === 0
  console.log('\n' + (ok ? 'PASS' : 'FAIL'))
  process.exit(ok ? 0 : 1)
})().catch(e => { console.error('FATAL', e); process.exit(2) })
