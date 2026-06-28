const path = require('path')
const fs = require('fs')
const os = require('os')
const mkdirp = require('mkdirp')
const puppeteer = require('puppeteer')

const { launchOptions, startFixtureServer } = require('./e2e/helpers')

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

module.exports = async function () {
  const { server, baseUrl } = await startFixtureServer()
  global.__FIXTURE_SERVER__ = server

  const browser = await puppeteer.launch(launchOptions())
  global.__BROWSER_GLOBAL__ = browser

  // Hand the wsEndpoint and fixture URL to the per-file test environments.
  mkdirp.sync(DIR)
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint())
  fs.writeFileSync(path.join(DIR, 'baseUrl'), baseUrl)

  // Give the service worker and offscreen document time to warm up the model.
  await new Promise(resolve => setTimeout(resolve, 5000))
}
