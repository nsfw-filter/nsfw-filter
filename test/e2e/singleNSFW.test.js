const NSFWUrls = [
    'https://i.imgur.com/y9aPMnm.jpg',
    'https://i.imgur.com/boAo7Jq.jpg',
]

describe('Should filter NSFW images', () => {
    test.each(NSFWUrls)(`Check single NSFW image %s`, async (url, done) => {
        await page.goto(url, { waituntil: "domcontentloaded" })
        
        const data = await global.getDocumentImageAttributes()
        data.forEach(element => expect(element === "nsfw").toBeTruthy())
        done()
    })
})
