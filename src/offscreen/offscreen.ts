/* eslint-disable @typescript-eslint/strict-boolean-expressions */

// The offscreen document is the only place in a Manifest V3 extension where we
// still have a full DOM (so `new Image()` works) AND can run TensorFlow.js. The
// service worker forwards every image URL here, we load + classify it, and send
// back a boolean. WebAssembly is used as the TFJS backend because Manifest V3's
// CSP forbids `unsafe-eval` (the WebGL backend's requirement) but allows
// `wasm-unsafe-eval`.

import { enableProdMode, env as tfEnv, ready as tfReady, setBackend } from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { load as loadModel } from 'nsfwjs'

import { Model } from '../background/Model'
import { Logger } from '../utils/Logger'
import {
  OffscreenClassifyResponse,
  OffscreenRequest
} from '../utils/messages'

const MODEL_PATH = '../models/'
const IMAGE_SIZE = 224
const LOADING_TIMEOUT = 1000
const DEFAULT_FILTER_STRICTNESS = 55
const MAX_LOAD_ATTEMPTS = 5

const logger = new Logger()

let model: Model | null = null
let pendingStrictness = DEFAULT_FILTER_STRICTNESS

// Serialise the actual prediction so the model is never called re-entrantly
// (mirrors the original PredictionQueue concurrency of 1). Image *loading*
// still happens in parallel because it occurs before joining this chain.
let predictionChain: Promise<unknown> = Promise.resolve()

enableProdMode()

const modelReady: Promise<void> = (async () => {
  setWasmPaths(chrome.runtime.getURL('src/'))
  // Force the single-threaded WASM backend. The multi-threaded (pthread) variant
  // (tfjs-backend-wasm-threaded-simd.wasm) spawns Web Workers from blob: URLs,
  // which the Manifest V3 CSP (script-src 'self' 'wasm-unsafe-eval') blocks, and
  // it also needs the cross-origin isolation an offscreen document doesn't have.
  // Disabling multithread support makes the backend pick the plain -simd.wasm,
  // which runs entirely on this thread. One thread is plenty for the
  // single-image-at-a-time classification we perform.
  tfEnv().set('WASM_HAS_MULTITHREAD_SUPPORT', false)
  await setBackend('wasm')
  await tfReady()

  let attempts = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // @ts-expect-error nsfwjs load options typing
      const nsfwModel = await loadModel(MODEL_PATH, { type: 'graph' })
      model = new Model(nsfwModel, logger, { filterStrictness: pendingStrictness })
      return
    } catch (error) {
      attempts++
      logger.error(error as Error)
      logger.log(`Reload model, attempt: ${attempts}`)
      if (attempts >= MAX_LOAD_ATTEMPTS) throw error
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
})()

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const image: HTMLImageElement = new Image(IMAGE_SIZE, IMAGE_SIZE)

  return await new Promise((resolve, reject) => {
    setTimeout(reject, LOADING_TIMEOUT, new Error(`Image load timeout ${url}`))
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = (err) => reject(err)
    image.src = url
  })
}

const classify = async (url: string): Promise<boolean> => {
  await modelReady
  if (model === null) throw new Error('Model is not loaded')

  const image = await loadImage(url)

  const run = predictionChain.then(async () => await (model as Model).predictImage(image, url))
  // Keep the chain alive even if this prediction rejects.
  predictionChain = run.catch(() => undefined)
  return await run
}

chrome.runtime.onMessage.addListener((
  message: OffscreenRequest,
  _sender,
  sendResponse: (response: OffscreenClassifyResponse) => void
) => {
  if (message?.target !== 'offscreen') return

  if (message.type === 'SET_SETTINGS') {
    pendingStrictness = message.filterStrictness
    message.logging ? logger.enable() : logger.disable()
    if (model !== null) model.setSettings({ filterStrictness: message.filterStrictness })
    return
  }

  if (message.type === 'CLASSIFY') {
    classify(message.url)
      .then(result => sendResponse({ result }))
      .catch((error: Error) => sendResponse({ result: false, error: error?.message ?? String(error) }))

    return true // keep the message channel open for the async response
  }
})
