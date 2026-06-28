const os = require('os')
const path = require('path')
const rimraf = require('rimraf')

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

module.exports = async function () {
  // Guard both globals: if setup failed part-way they may be undefined, and an
  // unguarded close() here would throw and mask the original setup error.
  if (global.__BROWSER_GLOBAL__ !== undefined) await global.__BROWSER_GLOBAL__.close()
  if (global.__FIXTURE_SERVER__ !== undefined) {
    await new Promise(resolve => global.__FIXTURE_SERVER__.close(resolve))
  }

  rimraf.sync(DIR)
}
