import { OffscreenModel } from '../../src/background/OffscreenModel'
import { RESTARTING_MESSAGE } from '../../src/utils/messages'

// A classification lost to the offscreen document reloading itself onto WASM looks
// exactly like a failed one, and a failure reaches the page as "safe". These cover
// the difference: a lost classification is sent again, a real error is not.

type Reply = { result: boolean } | { error: string } | 'gone'

const chromeWith = (replies: Reply[]): { sent: number } => {
  const state = { sent: 0 }

  const sendMessage = (_request: unknown, respond: (value: unknown) => void): void => {
    const reply = replies[Math.min(state.sent, replies.length - 1)]
    state.sent++

    if (reply === 'gone') {
      // Chrome reports a closed port through lastError and an undefined response.
      chromeStub.runtime.lastError = { message: 'The message port closed' }
      respond(undefined)
      chromeStub.runtime.lastError = undefined
      return
    }

    respond(reply)
  }

  const chromeStub = { runtime: { sendMessage, lastError: undefined as { message: string } | undefined } }
  Object.assign(global, { chrome: chromeStub })

  return state
}

describe('background => OffscreenModel', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  // Each resend waits on a timer, so the test has to drive the clock forward for
  // the loop to make progress. The outcome is captured as a value because the
  // rejection would otherwise go unhandled while the clock runs.
  const settle = async (prediction: Promise<boolean>): Promise<boolean | string> => {
    const outcome = prediction.then(result => result, (error: Error) => error.message)

    for (let tick = 0; tick < 40; tick++) await jest.advanceTimersByTimeAsync(1000)

    return await outcome
  }

  test('Should send a classification again when the realm went away', async () => {
    const state = chromeWith(['gone', 'gone', { result: true }])
    const outcome = await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))

    expect(outcome).toBe(true)
    expect(state.sent).toBe(3)
  })

  test('Should send it again while the document is still on its way out', async () => {
    const state = chromeWith([{ error: RESTARTING_MESSAGE }, { result: true }])
    const outcome = await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))

    expect(outcome).toBe(true)
    expect(state.sent).toBe(2)
  })

  test('Should not send it again when the model answered with an error', async () => {
    const state = chromeWith([{ error: 'Image load timeout' }])
    const outcome = await settle(new OffscreenModel().predict('http://localhost/slow.jpg'))

    expect(outcome).toBe('Image load timeout')
    expect(state.sent).toBe(1)
  })

  test('Should give up rather than resend a realm that never comes back', async () => {
    const state = chromeWith(['gone'])
    const outcome = await settle(new OffscreenModel().predict('http://localhost/nsfw.jpg'))

    expect(outcome).toBe('The message port closed')
    expect(state.sent).toBeLessThan(40)
  })
})
