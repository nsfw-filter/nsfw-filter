// Layout regression guard for the popup. A 3.0.0 rewrite gave every row
// width:100% + padding without box-sizing:border-box, so the padding landed
// outside the 320px column and Chrome grew the popup to ~800px, clipping the
// header toggle, the "Hide" effect, and the footer links off the right edge.
// This renders the real popup and fails if anything spills past the column.
const settle = ms => new Promise(resolve => setTimeout(resolve, ms))

const extensionId = async () => {
  const target = await global.__BROWSER__.waitForTarget(
    t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'),
    { timeout: 25000 }
  )
  return new URL(target.url()).host
}

// Right edge of every element vs the popup window's own right edge. Measuring
// against the viewport (not the inner column) catches the case where the column
// itself overflows the window, which is exactly the box-sizing bug we guard.
const measureOverflow = page => page.evaluate(() => {
  const column = document.getElementById('popup').firstElementChild
  const right = document.documentElement.clientWidth
  return [...column.querySelectorAll('*')]
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.right > right + 1)
    .map(({ el, r }) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 24),
      over: Math.round(r.right - right)
    }))
})

describe('Popup layout', () => {
  let page

  const open = async () => {
    page = await global.__BROWSER__.newPage()
    await page.goto(`chrome-extension://${await extensionId()}/src/popup.html`, {
      waitUntil: 'networkidle0',
      timeout: 20000
    })
    await settle(1000)
  }

  afterEach(async () => {
    if (page) await page.close()
    page = undefined
  })

  test('no content is clipped past the 320px column', async () => {
    await open()
    expect(await measureOverflow(page)).toEqual([])
  })

  test('key controls and links render in full', async () => {
    await open()
    const text = await page.evaluate(() => document.getElementById('popup').textContent)
    for (const label of ['NSFW', 'Filter', 'Blur', 'Hide', 'Star on GitHub', 'Sponsor on Patreon']) {
      expect(text).toContain(label)
    }
    // "Grayscale" is shortened to "Gray" so it fits its third of the block
    // control; the full word would ellipsis to "Gra...".
    expect(text).toContain('Gray')
  })

  test('Advanced panel controls render in full when expanded', async () => {
    await open()
    await page.evaluate(() => {
      document.querySelector('button[aria-controls="advanced-panel"]').click()
    })
    await settle(300)
    const text = await page.evaluate(() => document.getElementById('popup').textContent)
    expect(text).toContain('Trained model')
    expect(text).toContain('Show logs in browser console')
    expect(await measureOverflow(page)).toEqual([])
  })

  test('stays within the column after toggling dark mode', async () => {
    await open()
    await page.evaluate(() => {
      document.querySelector('button[aria-label], #popup button').click()
    })
    await settle(500)
    expect(await measureOverflow(page)).toEqual([])
  })
})
