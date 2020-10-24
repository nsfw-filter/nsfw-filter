const nsfwCriteria = ['Hentai', 'Sexy', 'Porn']
const sfwCriteria = ['Nature']

// @TODO stable
describe.skip('Should filter NSFW lazy loaded images', () => {

    beforeAll(async (done) => {
        let page = await global.__BROWSER__.newPage();
        // Turn off safe search on duckduckgo
        const startUrl = `https://duckduckgo.com/?q=1&ia=images&iax=images`
        await page.goto(startUrl, {waitUntil: 'domcontentloaded'})
        await page.waitForSelector('.dropdown--safe-search')
        await page.click('.dropdown--safe-search')
        await page.waitForXPath("//ol/li/a[contains(text(), 'Off')]", { visible: true })

        const [turnOffButton] = await page.$x("//ol/li/a[contains(text(), 'Off')]")
        if (turnOffButton) {
            await Promise.all([
                turnOffButton.click(),
                page.waitForNavigation({waitUntil: 'domcontentloaded'})
            ])
        }
        done()
    })

    test.each(nsfwCriteria)(`search for %s should block at least one of the NSFW images`, async (criteria, done) => {
        let page = await global.__BROWSER__.newPage();
        const data = await searchDuckDuckGo(criteria, page)
        var totalImages = data.length
        var blockedImages = data.filter(value => value === 'nsfw').length
        console.log(`blocked ${blockedImages} from ${totalImages} duckduckgo search results of ${criteria}`)

        await expect(totalImages).toBeGreaterThan(0)
        await expect(blockedImages).toBeGreaterThan(0)
        done()
    })

    test.each(sfwCriteria)(`search for %s should show at least one of the SFW images`, async (criteria, done) => {
        let page = await global.__BROWSER__.newPage();
        const data = await searchDuckDuckGo(criteria, page)
        var totalImages = data.length
        var blockedImages = data.filter(value => value === 'nsfw').length
        var visibleImages = totalImages - blockedImages
        console.log(`blocked ${blockedImages} from ${totalImages} duckduckgo search results of ${criteria}`)

        await expect(totalImages).toBeGreaterThan(0)
        await expect(visibleImages).toBeGreaterThan(0)
        done()
    })
})


/**
 * Search duckduckgo for specified criteria
 * return array of image attribute values from the search results page
 * @param {string} criteria 
 * @param {any} page 
 */
async function searchDuckDuckGo(criteria, page) {
    // prevent loading too much images
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 9; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36')

    let searchUrl = `https://duckduckgo.com/?q=${criteria}&ia=images&iax=images`
    await page.goto(searchUrl, {waitUntil: 'domcontentloaded'})
    // Cosmetic filter for non-headless test
    await page.evaluate(() => {
        document.head.insertAdjacentHTML("beforeend", `<style>.tile { filter: blur(15px) }</style>`)
    })
    await page.waitForTimeout(2000)

    return await global.getDocumentImageAttributes(page)
}
