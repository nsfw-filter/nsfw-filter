require("expect-puppeteer");

beforeAll(async () => {
    // wait for model to load
    await page.waitForTimeout(5000)
});
