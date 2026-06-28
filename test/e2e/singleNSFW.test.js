// Network-dependent: navigates to remote NSFW images and expects them blocked.
// Opt in with E2E_NETWORK=true. These rely on remote images loading within the
// offscreen 1s LOADING_TIMEOUT, so a slow connection reveals them unblurred and
// the test fails; the deterministic regression coverage is in staticImage.test.js.
const NSFWUrls = [
    'https://i.imgur.com/bY536ZM.jpeg',
    'https://i.imgur.com/y9aPMnm.jpg'
]

const settle = ms => new Promise(resolve => setTimeout(resolve, ms))
const describeNetwork = process.env.E2E_NETWORK === 'true' ? describe : describe.skip

describeNetwork('Should filter NSFW images', () => {
    test.each(NSFWUrls)(`Check single NSFW image %s`, async (url) => {
        const page = await global.__BROWSER__.newPage()

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' })
            await settle(5000)

            const data = await global.getDocumentImageAttributes(page)
            // Guard against a false green: a failed remote load yields no images,
            // and forEach over an empty array asserts nothing.
            expect(data.length).toBeGreaterThan(0)
            data.forEach(element => expect(element).toBe('nsfw'))
        } finally {
            await page.close()
        }
    })
})
