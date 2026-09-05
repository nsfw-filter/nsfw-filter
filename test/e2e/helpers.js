const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')

const extensionPath = path.join(__dirname, '../../dist')
const fixturesPath = path.join(__dirname, 'fixtures')

// Resolve a Chrome binary that works locally and on CI:
// 1. CI images (mujo-code/puppeteer-headful) provide Chrome via an env var.
// 2. puppeteer.executablePath() points at the version it shipped with, which is
//    not always the Chrome for Testing build actually installed in the cache.
// 3. Local fallback: whatever build is in the Puppeteer cache, resolving the
//    platform-specific binary instead of assuming macOS.
// Returns undefined if none resolve, so puppeteer falls back to its own default.
const resolveChromePath = () => {
  const fromEnv = process.env.PUPPETEER_EXEC_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv

  const declared = require('puppeteer').executablePath()
  if (declared && fs.existsSync(declared)) return declared

  const cache = path.join(os.homedir(), '.cache/puppeteer/chrome')
  if (!fs.existsSync(cache)) return undefined
  const build = fs.readdirSync(cache).sort().pop()
  if (build === undefined) return undefined

  return [
    ['chrome-linux64', 'chrome'],
    ['chrome-mac-arm64', 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'],
    ['chrome-mac-x64', 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'],
    ['chrome-win64', 'chrome.exe']
  ].map(parts => path.join(cache, build, ...parts)).find(p => fs.existsSync(p))
}

// `webgl: false` turns GL off entirely instead of enabling software GL, so the
// offscreen document has to come up on WASM, the path a machine with no usable
// GPU takes.
const launchOptions = ({ webgl = true } = {}) => ({
  headless: process.env.HEADLESS !== 'false',
  executablePath: resolveChromePath(),
  defaultViewport: null,
  // Chrome disables extensions under automation by default; allow ours through.
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    ...(webgl
      // The model runs on WebGL; force a software backend so it works without a GPU.
      ? ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']
      : ['--disable-gpu', '--disable-software-rasterizer', '--use-gl=disabled'])
  ]
})

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.png': 'image/png',
  '.webm': 'video/webm'
}

// A small static server so tests run against local fixtures instead of remote
// hosts. Local images load instantly, which keeps classification deterministic.
const startFixtureServer = async () => {
  const icon = fs.readFileSync(path.join(extensionPath, 'images/icon128.png'))

  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0]
    if (url === '/icon.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(icon)
      return
    }

    const file = path.join(fixturesPath, url === '/' ? 'static.html' : url)
    if (!file.startsWith(fixturesPath) || !fs.existsSync(file)) {
      res.writeHead(404)
      res.end()
      return
    }

    const body = fs.readFileSync(file)
    const type = CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream'
    // Chrome asks for video by range and will not start playback on a server that
    // answers 200 to every request.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '')
    // An empty file has no satisfiable range; answering the whole of it is allowed.
    if (range !== null && body.length > 0) {
      // `bytes=-500` asks for the last 500 bytes, not the first 501.
      const suffix = range[1] === ''
      const start = suffix ? Math.max(body.length - Number(range[2]), 0) : Number(range[1])
      const end = suffix || range[2] === '' ? body.length - 1 : Math.min(Number(range[2]), body.length - 1)
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${body.length}` })
        res.end()
        return
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${body.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1
      })
      res.end(body.subarray(start, end + 1))
      return
    }

    res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, 'Accept-Ranges': 'bytes' })
    res.end(body)
  })

  await new Promise(resolve => server.listen(0, resolve))
  return { server, baseUrl: `http://localhost:${server.address().port}/` }
}

module.exports = { launchOptions, startFixtureServer }
