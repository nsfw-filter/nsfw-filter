const path = require('path')
const fs = require('fs')
const os = require('os')
const puppeteer = require('puppeteer')

const { launchOptions, startFixtureServer } = require('./e2e/helpers')

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

module.exports = async function () {
  const { server, baseUrl } = await startFixtureServer()
  global.__FIXTURE_SERVER__ = server

  const browser = await puppeteer.launch(launchOptions())
  global.__BROWSER_GLOBAL__ = browser

  // A second browser with GL off, for the tests that need the WASM backend the
  // extension falls back to when there is no usable GPU. Test files can't launch
  // it themselves: jest doesn't transform their requires, and puppeteer is ESM.
  const noGpuBrowser = await puppeteer.launch(launchOptions({ webgl: false }))
  global.__BROWSER_NO_GPU_GLOBAL__ = noGpuBrowser

  // Hand the wsEndpoints and fixture URL to the per-file test environments.
  fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint())
  fs.writeFileSync(path.join(DIR, 'wsEndpointNoGpu'), noGpuBrowser.wsEndpoint())
  fs.writeFileSync(path.join(DIR, 'baseUrl'), baseUrl)

  // Give the service worker and offscreen document time to warm up the model.
  await new Promise(resolve => setTimeout(resolve, 5000))
}
