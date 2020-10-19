require("expect-puppeteer");

beforeAll(async () => {
    // wait for model to load
    await page.waitForTimeout(25000)
});


/**
 * Check the images of the page
 * get their data-nsfw-fillter-status attributes and return them from the page
 */
global.getDocumentImageAttributes = async () =>  {
    const data = await page.evaluate(async () => {
        const result = [...document.images]
            .filter(element => element.getAttribute("data-nsfw-filter-status"))
            .map(element => new Promise((resolve, _reject) => {
                waitForImageProcessing()

                function waitForImageProcessing() {
                    const status = element.getAttribute("data-nsfw-filter-status")
                    if (status === "processing") setTimeout(waitForImageProcessing, 500)
                    else {
                        resolve(status)
                    }
                }
            }))
        return await Promise.all(result)
    })
    return data
}