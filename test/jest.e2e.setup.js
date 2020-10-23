/**
 * Check the images of the page
 * get their data-nsfw-fillter-status attributes and return them from the page
 */
global.getDocumentImageAttributes = async (page) =>  {
    const data = await page.evaluate(async () => {
        const result = [...document.images]
            .filter(element => element.getAttribute("data-nsfw-filter-status"))
            .map(element => new Promise((resolve) => {
                let attempt = 0
                const waitForImageProcessing = () => {
                    attempt++
                    const status = element.getAttribute("data-nsfw-filter-status")
                    
                    if (status === "processing" && attempt > 60) {
                        resolve(undefined)
                    } else if (status === "processing" && attempt <= 60) {
                        setTimeout(waitForImageProcessing, 500)
                    } else {
                        resolve(status)
                    }
                }

                waitForImageProcessing()
            }))
        
        const _result = await Promise.all(result)
        return _result.filter(Boolean)
    })
    return data
}
