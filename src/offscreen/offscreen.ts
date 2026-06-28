/* eslint-disable @typescript-eslint/strict-boolean-expressions */

// The offscreen document is the only place in a Manifest V3 extension with both
// a full DOM (so `new Image()` works) and the ability to run TensorFlow.js. The
// service worker forwards every image URL here; we load it, classify it, and
// return a boolean. We prefer the WebGL (GPU) backend, the one the MV2 background
// page used, and fall back to single-threaded WASM (CPU) when no usable GPU is
// available. See trySetWebglBackend() and setWasmBackend() for the CSP details.

import { enableProdMode, env as tfEnv, getBackend, ready as tfReady, setBackend, tensor1d, tidy } from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'
import { load as loadModel, NSFWJS } from 'nsfwjs'

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

// Serialise predictions so the model is never called re-entrantly (the original
// PredictionQueue used concurrency 1). Image loading still runs in parallel; it
// happens before joining this chain.
let predictionChain: Promise<unknown> = Promise.resolve()

enableProdMode()

const WEBGL_PROBE_TIMEOUT = 3000
const WARMUP_TIMEOUT = 8000
// Cap a single classification. Predictions are serialised through
// predictionChain, so one stuck predictImage would wedge every queued image
// behind it (and the content script's pending-hide stylesheet would leave them
// hidden). On timeout the prediction rejects, the image is revealed, and the
// chain is freed for the next request.
const PREDICTION_TIMEOUT = 10000

// Reject if `promise` doesn't settle within `ms`, so a hang (not just a thrown
// error) in WebGL init or warm-up can't wedge the offscreen document, e.g. a
// buggy GPU driver that never returns from a read-back.
const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })
}

// Switch TensorFlow.js to the WebGL (GPU) backend, the one the MV2 background
// page used by default. The MV3 CSP only forbids JS eval; the WebGL backend
// compiles GLSL shaders on the GPU instead of evaluating JS, so it stays
// CSP-safe. Returns true if WebGL registered and a small GPU op round-trips;
// false (without throwing) if anything fails or hangs, so the caller can fall
// back to WASM.
const trySetWebglBackend = async (): Promise<boolean> => {
  try {
    if (!(await withTimeout(setBackend('webgl'), WEBGL_PROBE_TIMEOUT, 'WebGL setBackend'))) return false
    await tfReady()
    // setBackend('webgl') can register but still fail or hang on the first real
    // op if the context is unusable. Run a small computation and read it back
    // from the GPU to prove the path works. tidy() returns the result tensor, so
    // dispose it after reading, or it leaks a GPU texture for the life of the
    // document.
    const probe = tidy(() => tensor1d([1, 2, 3]).square())
    try {
      await withTimeout(probe.data(), WEBGL_PROBE_TIMEOUT, 'WebGL probe op')
    } finally {
      probe.dispose()
    }
    return getBackend() === 'webgl'
  } catch (error) {
    logger.error(error as Error)
    return false
  }
}

// Switch to the WASM (CPU) backend, forcing the single-threaded variant. The
// multi-threaded build (tfjs-backend-wasm-threaded-simd.wasm) spawns Web Workers
// from blob: URLs, which the MV3 CSP blocks, and needs cross-origin isolation
// the offscreen document lacks. One thread is enough for the single image we
// classify at a time.
const setWasmBackend = async (): Promise<void> => {
  setWasmPaths(chrome.runtime.getURL('src/'))
  tfEnv().set('WASM_HAS_MULTITHREAD_SUPPORT', false)
  await setBackend('wasm')
  await tfReady()
}

// Run one throwaway classification. This compiles the backend's kernels during
// init (while page images are still hidden) so the first real image isn't slow,
// and it confirms the backend can run the full model: a small probe op can
// succeed on a GPU that then hangs on the real graph. Returns true if it
// finished within the timeout, so WebGL can be abandoned for WASM otherwise.
const warmUpModel = async (nsfwModel: NSFWJS): Promise<boolean> => {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = IMAGE_SIZE
    canvas.height = IMAGE_SIZE
    await withTimeout(nsfwModel.classify(canvas, 1), WARMUP_TIMEOUT, 'Model warm-up')
    return true
  } catch (error) {
    logger.error(error as Error)
    return false
  }
}

// Load the model on the current backend and warm it up. Returns the model, or
// null if the warm-up hung or failed (used when probing WebGL so we can retry on
// WASM).
const loadAndWarm = async (requireWarm: boolean): Promise<NSFWJS | null> => {
  // @ts-expect-error nsfwjs load options typing
  const nsfwModel: NSFWJS = await loadModel(MODEL_PATH, { type: 'graph' })
  const warmed = await warmUpModel(nsfwModel)
  if (!warmed && requireWarm) return null
  return nsfwModel
}

const modelReady: Promise<void> = (async () => {
  let backend = (await trySetWebglBackend()) ? 'webgl' : 'wasm'
  if (backend === 'wasm') await setWasmBackend()

  let attempts = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // On WebGL the warm-up doubles as GPU validation: if the full model can't
      // run there, drop to WASM and reload instead of using a backend that hangs
      // on every image.
      let nsfwModel = await loadAndWarm(backend === 'webgl')
      if (nsfwModel === null && backend === 'webgl') {
        logger.log('WebGL cannot run the model; falling back to WASM')
        backend = 'wasm'
        await setWasmBackend()
        nsfwModel = await loadAndWarm(false)
      }
      if (nsfwModel === null) throw new Error('Model warm-up failed')

      logger.log(`TFJS backend: ${backend}`)
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
    const timer = setTimeout(() => reject(new Error(`Image load timeout ${url}`)), LOADING_TIMEOUT)
    image.crossOrigin = 'anonymous'
    image.onload = () => { clearTimeout(timer); resolve(image) }
    image.onerror = (err) => { clearTimeout(timer); reject(err) }
    image.src = url
  })
}

const classify = async (url: string): Promise<boolean> => {
  await modelReady
  if (model === null) throw new Error('Model is not loaded')

  const image = await loadImage(url)

  const run = predictionChain.then(async () =>
    await withTimeout((model as Model).predictImage(image, url), PREDICTION_TIMEOUT, 'Prediction'))
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
