import { OffscreenModel } from '../../src/background/OffscreenModel'
import { RESTARTING_MESSAGE } from '../../src/utils/messages'

// A classification lost to the offscreen document reloading itself looks exactly
// like a failed one, and a failure reaches the page as safe. These cover the
// difference, and the window the proxy is allowed to keep sending in: it opens when
// the loss is first seen, not when the classification was sent, so a slow bring-up
// can't spend it before the restart it exists to cover.

const WINDOW = 30000

// What the offscreen document does with one request: answer, report an error, or
// be gone. `after` delays the reply, so a realm that is merely slow is separable
// from one that has died.
type Reply = { result: boolean } | { error: string } | 'gone'
type Scripted = { reply: Reply, after?: number }

type Harness = { sentAt: number[] }

const chromeWith = (script: Scripted[]): Harness => {
  const harness: Harness = { sentAt: [] }
  // Fake timers start the clock at the real time, so sends are recorded relative
  // to the first one.
  const start = Date.now()

  const deliver = (reply: Reply, respond: (value: unknown) => void): void => {
    if (reply === 'gone') {
      // Chrome reports a closed port through lastError and an undefined response.
      chromeStub.runtime.lastError = { message: 'The message port closed' }
      respond(undefined)
      chromeStub.runtime.lastError = undefined
      return
    }
    respond(reply)
  }

  const sendMessage = (_request: unknown, respond: (value: unknown) => void): void => {
    const step = script[Math.min(harness.sentAt.length, script.length - 1)]
    harness.sentAt.push(Date.now() - start)

    if (step.after === undefined) deliver(step.reply, respond)
    else setTimeout(() => { deliver(step.reply, respond) }, step.after)
  }

  const chromeStub = { runtime: { sendMessage, lastError: undefined as { message: string } | undefined } }
  Object.assign(global, { chrome: chromeStub })

  return harness
}

describe('background => OffscreenModel', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  // Resends wait on a timer, so the test drives the clock for the loop to make
  // progress. The outcome is captured as a value because the rejection would
  // otherwise go unhandled while the clock runs.
  const settle = async (prediction: Promise<boolean>): Promise<boolean | string> => {
    const outcome = prediction.then(result => result, (error: Error) => error.message)
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000)
    return await outcome
  }

  test('Should send a classification again when the realm went away', async () => {
    const harness = chromeWith([{ reply: 'gone' }, { reply: 'gone' }, { reply: { result: true } }])

    expect(await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))).toBe(true)
    expect(harness.sentAt).toEqual([0, 1000, 2000])
  })

  test('Should send it again while the document is still on its way out', async () => {
    const harness = chromeWith([{ reply: { error: RESTARTING_MESSAGE } }, { reply: { result: true } }])

    expect(await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))).toBe(true)
    expect(harness.sentAt).toHaveLength(2)
  })

  test('Should not send it again when the model answered with an error', async () => {
    const harness = chromeWith([{ reply: { error: 'Image load timeout' } }])

    expect(await settle(new OffscreenModel().predict('http://localhost/slow.jpg'))).toBe('Image load timeout')
    expect(harness.sentAt).toHaveLength(1)
  })

  test('Should stop sending once the window has closed', async () => {
    const harness = chromeWith([{ reply: 'gone' }])

    expect(await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))).toBe('The message port closed')
    expect(Math.max(...harness.sentAt)).toBeLessThan(WINDOW)
    expect(harness.sentAt).toHaveLength(WINDOW / 1000)
  })

  // The window has to start at the loss, not at the request: a bring-up slower than
  // the window would otherwise use it all up before the restart even happened.
  test('Should still resend when the realm is lost long after the request', async () => {
    const harness = chromeWith([
      { reply: { error: RESTARTING_MESSAGE }, after: 31000 },
      { reply: { result: true } }
    ])

    expect(await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))).toBe(true)
    expect(harness.sentAt).toEqual([0, 32000])
  })

  // A realm that accepts the request and takes its time is not a lost one.
  test('Should wait out a slow answer rather than send again', async () => {
    const harness = chromeWith([
      { reply: 'gone' },
      { reply: { result: true }, after: 35000 }
    ])

    expect(await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))).toBe(true)
    expect(harness.sentAt).toEqual([0, 1000])
  })

  // A loss arriving just before the window shuts must not buy another send.
  test('Should not send again when the wait would cross the window', async () => {
    const harness = chromeWith([
      { reply: 'gone' },
      { reply: 'gone', after: 28500 }
    ])

    expect(await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))).toBe('The message port closed')
    expect(harness.sentAt).toEqual([0, 1000])
  })
})
