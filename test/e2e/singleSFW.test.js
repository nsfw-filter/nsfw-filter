const SFWUrls = [
    'http://i.imgur.com/0WkpMWf.jpg',
    'http://i.imgur.com/0X9OHoH.jpg',
]

describe('Should not filter SFW images', () => {
    test.each(SFWUrls)(`Check single SFW image %s`, async (url, done) => {
        let page = await global.__BROWSER__.newPage();

        await page.goto(url, {waituntil: "domcontentloaded"})
        await page.waitForTimeout(5000)
        
        const data = await global.getDocumentImageAttributes(page)
        data.forEach(element => expect(element === "sfw").toBeTruthy())
        done()
    })
})
