// Network-dependent: navigates to remote SFW images and expects them shown.
// Opt in with E2E_NETWORK=true. staticImage.test.js covers the SFW path
// deterministically; this checks real-world images when the network is available.
const SFWUrls = [
    'http://i.imgur.com/0WkpMWf.jpg',
    'http://i.imgur.com/0X9OHoH.jpg',
]

const settle = ms => new Promise(resolve => setTimeout(resolve, ms))
const describeNetwork = process.env.E2E_NETWORK === 'true' ? describe : describe.skip

describeNetwork('Should not filter SFW images', () => {
    test.each(SFWUrls)(`Check single SFW image %s`, async (url) => {
        const page = await global.__BROWSER__.newPage()

        await page.goto(url, { waitUntil: 'domcontentloaded' })
        await settle(5000)

        const data = await global.getDocumentImageAttributes(page)
        data.forEach(element => expect(element).toBe('sfw'))
        await page.close()
    })
})
