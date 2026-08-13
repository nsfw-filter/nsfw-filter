const settle = ms => new Promise(resolve => setTimeout(resolve, ms))

const extensionId = async () => {
  const target = await global.__BROWSER__.waitForTarget(
    t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'),
    { timeout: 25000 }
  )
  return new URL(target.url()).host
}

const clickNamed = (page, label) => page.evaluate(name => {
  const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === name)
  if (button === undefined) throw new Error(`No button "${name}"`)
  button.click()
}, label)

const popupText = page => page.evaluate(() => document.getElementById('popup').textContent)

const protectionSwitchDisabled = page => page.evaluate(() => {
  const sw = document.querySelector('.ant-switch')
  return sw !== null && sw.classList.contains('ant-switch-disabled')
})

describe('Settings lock', () => {
  let page

  const open = async () => {
    if (page) await page.close()
    page = await global.__BROWSER__.newPage()
    await page.goto(`chrome-extension://${await extensionId()}/src/popup.html`, {
      waitUntil: 'networkidle0',
      timeout: 20000
    })
    await settle(1000)
  }

  const setPassword = async (value) => {
    await page.evaluate(() => {
      document.querySelector('button[aria-controls="advanced-panel"]').click()
    })
    await settle(200)
    await clickNamed(page, 'Set password')
    await settle(200)
    const fields = await page.$$('input[type="password"]')
    expect(fields.length).toBe(2)
    await fields[0].type(value)
    await fields[1].type(value)
    await clickNamed(page, 'Save password')
    await settle(500)
  }

  afterEach(async () => {
    if (page) {
      await page.evaluate(() => chrome.storage.local.clear())
      await page.close()
      page = undefined
    }
  })

  test('reopening the popup after setting a password shows the lock', async () => {
    await open()
    await setPassword('test')
    expect(await popupText(page)).toContain('Lock now')

    await open()
    const text = await popupText(page)
    expect(text).toContain('Settings locked')
    expect(text).toContain('Filter strictness')
    expect(await protectionSwitchDisabled(page)).toBe(true)
  })

  test('the correct password unlocks the controls', async () => {
    await open()
    await setPassword('test')
    await open()

    await page.locator('input[type="password"]').fill('test')
    await clickNamed(page, 'Unlock')
    await settle(400)

    const text = await popupText(page)
    expect(text).not.toContain('Settings locked')
    expect(await protectionSwitchDisabled(page)).toBe(false)

    await page.evaluate(() => {
      document.querySelector('button[aria-controls="advanced-panel"]').click()
    })
    await settle(200)
    expect(await popupText(page)).toContain('Lock now')
  })

  test('a wrong password stays locked and shows an error', async () => {
    await open()
    await setPassword('test')
    await open()

    await page.locator('input[type="password"]').fill('nope')
    await clickNamed(page, 'Unlock')
    await settle(400)

    expect(await popupText(page)).toContain('Settings locked')
    expect(await popupText(page)).toContain('Wrong password')
    expect(await protectionSwitchDisabled(page)).toBe(true)
  })
})
