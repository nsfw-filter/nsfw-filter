const { strictEqual } = require('assert')

const SFWUrls = [
    'http://i.imgur.com/0WkpMWf.jpg',
    'http://i.imgur.com/0X9OHoH.jpg',
    'http://i.imgur.com/0mJn28c.jpg',
]

describe('Should not filter SFW images', () => {
    test.each(SFWUrls)(`Check single SFW image %s`, async (url, done) => {
        await page.goto(url, {waituntil: "domcontentloaded"})

        const data = await page.evaluate(async () => {
            const result = [...document.images].map(element => new Promise((resolve, _reject) => {
                element.focus()
                setTimeout(() => {
                    resolve(window.getComputedStyle(element).getPropertyValue("visibility"))
                }, 3000)
            }))
            return await Promise.all(result)
        })

        await page.on('console', msg =>
        {
            for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
        });
        await page.screenshot()
        data.forEach(value => strictEqual(value, 'visible'))
        done()
    })
})
