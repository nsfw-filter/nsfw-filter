const { strictEqual } = require('assert')

const NSFWUrls = [
    'https://i.imgur.com/0XUW69F.jpg',
    'https://i.imgur.com/0ZW7Cyo.jpg',
    'https://i.imgur.com/0avXzJF.jpg',
]

describe('Should filter NSFW images', () => {
    test.each(NSFWUrls)(`Check single NSFW image %s`, async (url, done) => {
        await page.goto(url, {waituntil: "networkidle0"})

        const data = await page.evaluate(async () => {
            const result = [...document.images].map(element => new Promise((resolve, _reject) => {
                element.focus()
                setTimeout(() => {
                    resolve(window.getComputedStyle(element).getPropertyValue("visibility"))
                }, 3000)
            }))

            return await Promise.all(result)
        })

        data.forEach(value => strictEqual(value, 'hidden'))
        done()
    })
})
