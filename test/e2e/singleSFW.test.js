const puppeteer = require('puppeteer');
const { join } = require('path');
const { strictEqual } = require('assert');
 
const extensionPath = join(__dirname, '../../dist'); // For instance, 'dist'
const sleep = (ms) => new Promise((res) => setTimeout(() => res(), ms));

let browser
const SFWUrls = [
    'http://i.imgur.com/2XB9STs.jpg',
    'http://i.imgur.com/0WkpMWf.jpg',
    'http://i.imgur.com/0X9OHoH.jpg',
    'http://i.imgur.com/0mJn28c.jpg',
    'http://i.imgur.com/0v0Z64t.jpg'
]

beforeAll(async () => {
    browser = await puppeteer.launch({
        headless: process.env.HEADLESS !== 'false', // extension are allowed only in the head-full mode
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
        ],
        defaultViewport: null
    });

    await sleep(7000) // wait until model is loaded
});

describe('Should filter NSFW images', () => {
    for (const url of SFWUrls) {
        test(`Check single NSFW image ${url}`, async done => {
            const page = await browser.newPage();
            await page.goto(url);
    
            const data = await page.evaluate(async () => {
                const elements = document.body.getElementsByTagName("img");
    
                const result = [...elements].map(element => new Promise((resolve, _reject) => {
                    element.focus();
                    setTimeout(() => {
                        resolve(window.getComputedStyle(element).getPropertyValue("visibility"))
                    }, 3000)
                }))
    
                return await Promise.all(result)
            });
    
            data.forEach(value => strictEqual(value, 'visible'))
            if (url === SFWUrls[SFWUrls.length - 1]) {
                await browser.close();
            }

            done()
        });
    }
});
