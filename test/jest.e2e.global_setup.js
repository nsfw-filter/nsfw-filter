const path = require('path');
const fs = require('fs');
const os = require('os');
const mkdirp = require('mkdirp');
const puppeteer = require('puppeteer');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

const extensionPath = path.join(__dirname, '../dist')
const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = async function () {
    
  const browser = await puppeteer.launch({
    headless: false,
    product: "chrome",
    executablePath: process.env.PUPPETEER_EXEC_PATH, // set by docker container
    defaultViewport: null,
    args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    `--disable-dev-shm-usage`,
    `--no-sandbox`,
    `--disable-setuid-sandbox`
    ]});
  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  // wait one minute for extension to load
  global.__BROWSER_GLOBAL__ = browser;

  // use the file system to expose the wsEndpoint for TestEnvironments
  mkdirp.sync(DIR);
  fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
  await delay(5000);
};
