const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')

const extensionPath = path.join(__dirname, '../../dist')
const fixturesPath = path.join(__dirname, 'fixtures')

// puppeteer.executablePath() points at the version it shipped with, which is not
// always the Chrome for Testing build actually installed in the cache. Resolve
// the installed build instead so launches don't fail on a version mismatch.
const resolveChromePath = () => {
  const puppeteer = require('puppeteer')
  const declared = puppeteer.executablePath()
  if (fs.existsSync(declared)) return declared

  const cache = path.join(os.homedir(), '.cache/puppeteer/chrome')
  const build = fs.readdirSync(cache).sort().pop()
  return path.join(cache, build, 'chrome-mac-arm64', 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
}

const launchOptions = () => ({
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
    // The model runs on WebGL; force a software backend so it works without a GPU.
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader'
  ]
})

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
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(fs.readFileSync(file))
  })

  await new Promise(resolve => server.listen(0, resolve))
  return { server, baseUrl: `http://localhost:${server.address().port}/` }
}

module.exports = { launchOptions, startFixtureServer }
