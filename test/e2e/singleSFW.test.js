const SFWUrls = [
    'http://i.imgur.com/0WkpMWf.jpg',
    'http://i.imgur.com/0X9OHoH.jpg',
]

describe('Should not filter SFW images', () => {
    test.each(SFWUrls)(`Check single SFW image %s`, async (url, done) => {
        await page.goto(url, {waituntil: "domcontentloaded"})

        const data = await global.getDocumentImageAttributes()
        data.forEach(element => expect(element === "sfw").toBeTruthy())
        done()
    })
})
