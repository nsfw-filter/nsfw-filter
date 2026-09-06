// Regenerates test/e2e/fixtures/video.webm:
//   node test/e2e/fixtures/make-video.js test/e2e/fixtures/video.webm
//
// Two seconds of a solid grey canvas, recorded by the browser itself. The repo
// has no video encoder and none is worth adding for one fixture; Chrome already
// ships one behind MediaRecorder. Grey frames keep any real imagery out of the
// repository while still giving the filter a decodable frame to classify.

const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

const { launchOptions } = require('../helpers')

const record = async () => {
  const browser = await puppeteer.launch({ ...launchOptions(), headless: 'new' })

  try {
    const page = await browser.newPage()
    await page.goto('about:blank')

    return await page.evaluate(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      const context = canvas.getContext('2d')

      const draw = () => {
        context.fillStyle = '#6e6e6e'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      draw()
      const painting = setInterval(draw, 100)

      const chunks = []
      const recorder = new MediaRecorder(canvas.captureStream(25), { mimeType: 'video/webm' })
      recorder.ondataavailable = event => chunks.push(event.data)
      recorder.start()

      await new Promise(resolve => setTimeout(resolve, 2000))
      clearInterval(painting)

      const stopped = new Promise(resolve => { recorder.onstop = resolve })
      recorder.stop()
      await stopped

      const buffer = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()

      return [...new Uint8Array(buffer)]
    })
  } finally {
    await browser.close()
  }
}

const main = async () => {
  const target = process.argv[2] ?? path.join(__dirname, 'video.webm')
  const bytes = await record()
  fs.writeFileSync(target, Buffer.from(bytes))
  console.log(`wrote ${bytes.length} bytes to ${target}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
