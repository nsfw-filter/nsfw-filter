/* eslint-disable @typescript-eslint/strict-boolean-expressions */

// The offscreen document is the only place in a Manifest V3 extension where we
// still have a full DOM (so `new Image()` works) AND can run TensorFlow.js. The
// service worker forwards every image URL here, we load + classify it, and send
// back a boolean. We prefer the WebGL (GPU) backend — the same one the original
// MV2 background page used — and fall back to single-threaded WASM (CPU) when no
// usable GPU is available. See initBackend() for the Manifest V3 CSP details.

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

// Serialise the actual prediction so the model is never called re-entrantly
// (mirrors the original PredictionQueue concurrency of 1). Image *loading*
// still happens in parallel because it occurs before joining this chain.
let predictionChain: Promise<unknown> = Promise.resolve()

enableProdMode()

const WEBGL_PROBE_TIMEOUT = 3000
const WARMUP_TIMEOUT = 8000
// Cap a single classification. The model is serialised through predictionChain,
// so one stuck predictImage would otherwise wedge every queued image behind it
// forever (and, with the content script's pending-hide stylesheet, leave those
// images permanently hidden). On timeout this prediction rejects, the content
// script reveals its image, and the chain is freed for the next request.
const PREDICTION_TIMEOUT = 10000

// Reject if `promise` doesn't settle within `ms`. Used so a *hang* (not just a
// thrown error) in WebGL init or warm-up can't wedge the offscreen document —
// e.g. a blocklisted/buggy GPU driver that never returns from a GPU read-back.
const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })
}

// Try to switch TensorFlow.js to the WebGL (GPU) backend. WebGL is what the
// original MV2 background page used by default, so this restores the original
// performance. The Manifest V3 CSP only forbids JavaScript eval (`unsafe-eval`);
// the WebGL backend compiles GLSL shaders on the GPU rather than evaluating JS,
// so it is CSP-safe. Returns true if WebGL registered and a tiny GPU op round-
// trips successfully; false (without throwing) if anything fails or hangs, so
// the caller can fall back to WASM.
const trySetWebglBackend = async (): Promise<boolean> => {
  try {
    if (!(await withTimeout(setBackend('webgl'), WEBGL_PROBE_TIMEOUT, 'WebGL setBackend'))) return false
    await tfReady()
    // setBackend('webgl') can succeed at registration but fail (or hang) on the
    // first real op if the WebGL context is unusable. Run a tiny computation and
    // read the result back from the GPU to prove the path works end to end.
    // tidy() disposes the intermediate but returns the result tensor, so dispose
    // it explicitly after reading it back — otherwise it leaks one tiny GPU
    // texture for the life of the offscreen document.
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

// Switch to the WASM (CPU) backend. Force the single-threaded variant: the
// multi-threaded (pthread) build (tfjs-backend-wasm-threaded-simd.wasm) spawns
// Web Workers from blob: URLs, which the Manifest V3 CSP blocks, and it also
// needs the cross-origin isolation an offscreen document doesn't have. One
// thread is plenty for the single-image-at-a-time classification we perform.
const setWasmBackend = async (): Promise<void> => {
  setWasmPaths(chrome.runtime.getURL('src/'))
  tfEnv().set('WASM_HAS_MULTITHREAD_SUPPORT', false)
  await setBackend('wasm')
  await tfReady()
}

// Run one throwaway classification. This compiles the backend's shaders/kernels
// during init (while page images are already hidden) so the first real image the
// user sees isn't slow, AND it doubles as the definitive proof that the chosen
// backend can actually run the full model — a tiny probe op can succeed on a GPU
// that then hangs/fails on the real graph. Returns true if it completed within
// the timeout, false otherwise (so WebGL can be abandoned for WASM).
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

// Load the model on the current backend and warm it up. Returns the model if the
// warm-up classification actually ran; null if it hung/failed (only meaningful
// when probing WebGL, so we can retry on WASM).
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
      // On WebGL the warm-up is the real GPU validation: if the full model can't
      // run there, drop to WASM and reload rather than shipping a backend that
      // will hang on every image.
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
