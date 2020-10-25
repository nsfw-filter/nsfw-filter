const NSFWUrls = [
    'https://i.imgur.com/0avXzJF.jpg',
    'https://i.imgur.com/y9aPMnm.jpg'
]

describe('Should filter NSFW images', () => {
    test.each(NSFWUrls)(`Check single NSFW image %s`, async (url, done) => {
        let page = await global.__BROWSER__.newPage();

        await page.goto(url, { waituntil: "domcontentloaded" })
        await page.waitForTimeout(5000)

        const data = await global.getDocumentImageAttributes(page)
        data.forEach(element => expect(element === "nsfw").toBeTruthy())
        done()
    })
})
