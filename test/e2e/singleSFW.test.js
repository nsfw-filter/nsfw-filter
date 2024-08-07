const SFWUrls = [
    'https://i.imghippo.com/files/AFVXO1716345018.jpg',
    'https://i.imghippo.com/files/A4ybw1716345074.jpg',

]

describe('Should not filter SFW images', () => {
    test.each(SFWUrls)(`Check single SFW image %s`, async (url, done) => {
        let page = await global.__BROWSER__.newPage();

        await page.goto(url, {waituntil: "domcontentloaded"})
        
        const data = await global.getDocumentImageAttributes(page)
        data.forEach(element => expect(element === "sfw").toBeTruthy())
        done()
    })
})
