const puppeteer = require('puppeteer');
const { join } = require('path');
const { strictEqual } = require('assert');
 
const extensionPath = join(__dirname, '../../dist'); // For instance, 'dist'
const sleep = (ms) => new Promise((res) => setTimeout(() => res(), ms));

let browser
const SFWUrls = [
    'https://i.imgur.com/0XUW69F.jpg',
    'https://i.imgur.com/0ZW7Cyo.jpg',
    'https://i.imgur.com/0Z8uobI.jpg',
    'https://i.imgur.com/0avXzJF.jpg',
    'https://i.imgur.com/0dKVPQP.jpg'
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
    
            data.forEach(value => strictEqual(value, 'hidden'))
            if (url === SFWUrls[SFWUrls.length - 1]) {
                await browser.close();
            }

            done()
        });
    }
});
