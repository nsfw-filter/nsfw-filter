const os = require('os')
const path = require('path')
const rimraf = require('rimraf')

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

module.exports = async function () {
  await global.__BROWSER_GLOBAL__.close()
  await new Promise(resolve => global.__FIXTURE_SERVER__.close(resolve))

  rimraf.sync(DIR)
}
