const { join } = require('path');
const extensionPath = join(__dirname, '../dist')
const options = {width: 900, height: 900}

module.exports = {
    launch: {
        headless: process.env.HEADLESS !== 'false',
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            `--window-size=${options.width},${options.height}`
        ],
        defaultViewport: null,
        executablePath: process.env.PUPPETEER_EXEC_PATH, // set by docker container
    },
    browser: 'chromium',
    browserContext: 'default',
}
