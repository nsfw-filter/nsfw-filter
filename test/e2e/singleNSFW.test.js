const NSFWUrls = [
    'https://i.imghippo.com/files/5C44l1716344862.jpg',
    'https://i.imghippo.com/files/3KtEY1716344936.jpg'
]

describe('Should filter NSFW images', () => {
    test.each(NSFWUrls)(`Check single NSFW image %s`, async (url, done) => {
        let page = await global.__BROWSER__.newPage();

        await page.goto(url, { waituntil: "domcontentloaded" })

        const data = await global.getDocumentImageAttributes(page)
        data.forEach(element => expect(element === "nsfw").toBeTruthy())
        done()
    })
})
