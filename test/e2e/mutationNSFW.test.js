const nsfwCriteria_shouldBeHiddenRate_list = [['Hentai', 0.1], ['Sexy', 0.2], ['Porn', 0.2]]
const sfwCriteria_shoulbBeVisibleRate_list = [['Nature', 0.9]]

describe('Should filter NSFW lazy loaded images', () => {

    beforeAll(async (done) => {
        // duckduckgo load is huge with desktop user-agent
        await page.setUserAgent('Mozilla/5.0 (iPhone CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1')

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

    test.each(nsfwCriteria_shouldBeHiddenRate_list)(`search for %s should block at least %s of the NSFW images`, async (criteria, hiddenRate, done) => {
        const data = await searchDuckDuckGo(criteria)
        var totalImages = data.length
        var blockedImages = data.filter(value => value === 'nsfw').length
        console.log(`blocked ${blockedImages} from ${totalImages} duckduckgo search results of ${criteria}`)

        await expect(totalImages).toBeGreaterThan(0)
        await expect(blockedImages).toBeGreaterThan(0)
        await expect(blockedImages).toBeGreaterThan(totalImages * hiddenRate)
        done()
    })

    test.each(sfwCriteria_shoulbBeVisibleRate_list)(`search for %s should show at least %s of the SFW images`, async (criteria, visibleRate, done) => {
        const data = await searchDuckDuckGo(criteria)
        var totalImages = data.length
        var blockedImages = data.filter(value => value === 'nsfw').length
        var visibleImages = totalImages - blockedImages
        console.log(`blocked ${blockedImages} from ${totalImages} duckduckgo search results of ${criteria}`)

        await expect(totalImages).toBeGreaterThan(0)
        await expect(visibleImages).toBeGreaterThan(totalImages * visibleRate)
        done()
    })
})


/**
 * Search duckduckgo for specified criteria
 * return array of image attribute values from the search results page
 * @param {string} criteria 
 */
async function searchDuckDuckGo(criteria) {
    let searchUrl = `https://duckduckgo.com/?q=${criteria}&ia=images&iax=images`
    await page.goto(searchUrl, {waitUntil: 'domcontentloaded'})

    // Cosmetic filter for non-headless test
    await page.evaluate(() => {
        document.head.insertAdjacentHTML("beforeend", `<style>.tile { filter: blur(15px) }</style>`)
    })
    await page.waitForTimeout(2000)

    return await global.getDocumentImageAttributes()
}
