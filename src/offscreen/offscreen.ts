// The offscreen document is the only place in a Manifest V3 extension with both
// a full DOM (so `new Image()` works) and the ability to run TensorFlow.js. The
// service worker forwards every image URL here; we load it, classify it, and
// return a boolean. We prefer the WebGL (GPU) backend, the one the MV2 background
// page used, and fall back to single-threaded WASM (CPU) when no usable GPU is
// available. trySetWebglBackend() and setWasmBackend() cover the CSP details, and
// restartOnWasm() covers why the fallback reloads the document.
//
// This file owns the shared tfjs backend and serializes work; the actual model
// (weights, preprocessing, decision) lives behind a Classifier so the user can
// switch between models. Switching disposes one Classifier and loads another.

import { enableProdMode, env as tfEnv, getBackend, setBackend, tensor1d, tidy } from '@tensorflow/tfjs'
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm'

import { Logger } from '../utils/Logger'
import {
  OffscreenClassifyResponse,
  OffscreenRequest
} from '../utils/messages'
import { DEFAULT_TRAINED_MODEL, TrainedModel } from '../utils/models'
import { withTimeout } from '../utils/withTimeout'

import { BinaryClassifier } from './classifiers/BinaryClassifier'
import { Classifier } from './classifiers/Classifier'
import { NsfwjsClassifier } from './classifiers/NsfwjsClassifier'
import { readRestartState, saveRestartState } from './restartState'

const IMAGE_SIZE = 224
const LOADING_TIMEOUT = 1000
const DEFAULT_FILTER_STRICTNESS = 55
const MAX_LOAD_ATTEMPTS = 5

const logger = new Logger()

enableProdMode()

const WEBGL_PROBE_TIMEOUT = 3000
// Cap a single classification. Predictions are serialised through `enqueue`, so
// one stuck predict would wedge every queued image behind it (and the content
// script's pending-hide stylesheet would leave them hidden). On timeout the
// prediction rejects, the image is revealed, and the chain is freed.
const PREDICTION_TIMEOUT = 10000
// Fetching and compiling the .wasm binary is slower than probing WebGL.
const WASM_INIT_TIMEOUT = 15000

const restartState = readRestartState(sessionStorage, logger)

// Switch TensorFlow.js to the WebGL (GPU) backend, the one the MV2 background
// page used by default. The MV3 CSP only forbids JS eval; the WebGL backend
// compiles GLSL shaders on the GPU instead of evaluating JS, so it stays
// CSP-safe. Returns true if WebGL registered and a small GPU op round-trips;
// false (without throwing) if anything fails or hangs, so the caller can restart.
const trySetWebglBackend = async (): Promise<boolean> => {
  try {
    // setBackend resolves false when async initialisation fails, so trust the
    // boolean and getBackend() rather than calling tf.ready() after it.
    if (!(await withTimeout(setBackend('webgl'), WEBGL_PROBE_TIMEOUT, 'WebGL setBackend'))) return false
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
const setWasmBackend = async (): Promise<boolean> => {
  setWasmPaths(chrome.runtime.getURL('src/'))
  tfEnv().set('WASM_HAS_MULTITHREAD_SUPPORT', false)

  const ok = await withTimeout(setBackend('wasm'), WASM_INIT_TIMEOUT, 'WASM backend')
  return ok && getBackend() === 'wasm'
}

// The tfjs backend is global and picked once per document: WebGL, or WASM after a
// restart. It is never switched in place; see restartOnWasm.
let currentBackend: 'webgl' | 'wasm' | null = null
let restarting = false

const ensureBackend = async (): Promise<void> => {
  if (currentBackend !== null) return

  // Only an already-restarted document goes straight to WASM. A first attempt that
  // fails restarts instead, since trySetWebglBackend also returns false on a
  // timeout, and the timed-out work is still holding the GPU.
  if (restartState === null) {
    if (await trySetWebglBackend()) {
      currentBackend = 'webgl'
      return
    }
    restartOnWasm()
  }

  // Throw rather than leave currentBackend claiming a backend that isn't active.
  // bringUpClassifier retries, then every classification rejects and the content
  // script reveals the images.
  if (!(await setWasmBackend())) throw new Error('No usable TensorFlow.js backend')
  currentBackend = 'wasm'
}

// A WebGL probe or warm-up that timed out is still running on the GPU, and
// switching the live tfjs engine to WASM waits on it forever, so come back up in a
// clean realm instead. reload() only schedules the navigation, so throw as well
// rather than carry on in a realm about to go away. In-flight classifications are
// dropped and the content script reveals those images.
const restartOnWasm = (): never => {
  restarting = true
  saveRestartState(sessionStorage, {
    filterStrictness: pendingStrictness,
    trainedModel: pendingModelId,
    logging: pendingLogging
  })
  location.reload()

  throw new Error('Restarting the offscreen document on WASM')
}

// --- The active model and the work queue ----------------------------------

let activeClassifier: Classifier | null = null
let bringingUp = false
let pendingStrictness = restartState?.filterStrictness ?? DEFAULT_FILTER_STRICTNESS
let pendingModelId: TrainedModel = restartState?.trainedModel ?? DEFAULT_TRAINED_MODEL
let pendingLogging = restartState?.logging ?? false

if (pendingLogging) logger.enable()

// Serialise predictions AND model switches on one chain so a switch never
// disposes a model out from under an in-flight prediction (model concurrency =
// 1). Image *loading* still runs in parallel; it happens before joining here.
let opChain: Promise<unknown> = Promise.resolve()

const enqueue = async <T>(op: () => Promise<T>): Promise<T> => {
  const run = opChain.then(op)
  opChain = run.catch(() => undefined) // keep the chain alive past a rejection
  return await run
}

// A prediction that exceeds PREDICTION_TIMEOUT rejects and frees the chain (so
// one stuck image can't wedge the rest), but the underlying predict() may still
// be running against the model. Track it so switchTo() can wait for it to settle
// before disposing — otherwise a queued switch would dispose tensors mid-inference.
let inFlightPredict: Promise<unknown> = Promise.resolve()

const createClassifier = (id: TrainedModel): Classifier => {
  const settings = { filterStrictness: pendingStrictness }
  if (id === 'ViT_NSFW_384') return new BinaryClassifier(logger, settings)
  return new NsfwjsClassifier(logger, settings)
}

// Load a model on the current backend, retrying as the single-model version did.
// A model that can't come up on WebGL restarts the document on WASM instead.
const bringUpClassifier = async (id: TrainedModel): Promise<Classifier> => {
  await ensureBackend()

  let attempts = 0
  while (true) {
    try {
      const classifier = createClassifier(id)
      // Warm up on every backend so a model that can't run is never accepted. On
      // WASM the failure has to throw, so bringUpOrFallback tries the default
      // model instead.
      const ok = await classifier.load(true)
      if (!ok && currentBackend === 'webgl') {
        logger.log('WebGL cannot run the model; restarting the offscreen document on WASM')
        restartOnWasm()
      }
      if (!ok) {
        classifier.dispose()
        throw new Error('Model warm-up failed')
      }
      logger.log(`TFJS backend: ${currentBackend}, model: ${id}`)
      return classifier
    } catch (error) {
      // A restart is already scheduled; retrying would reload the model on the
      // backend that can't run it, in a realm about to be dropped.
      if (restarting) throw error
      attempts++
      logger.error(error as Error)
      logger.log(`Reload model, attempt: ${attempts}`)
      // Out of retries on WebGL. A load that keeps failing there may be waiting on
      // GPU work we can't cancel, so drop the realm rather than report no model.
      if (attempts >= MAX_LOAD_ATTEMPTS) {
        if (currentBackend === 'webgl') restartOnWasm()
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
}

// Never leave the document with no usable model: if the requested model can't
// load, fall back to the default rather than wedging every page's images hidden.
const bringUpOrFallback = async (id: TrainedModel): Promise<Classifier> => {
  try {
    return await bringUpClassifier(id)
  } catch (error) {
    if (restarting || id === DEFAULT_TRAINED_MODEL) throw error
    logger.error(error as Error)
    logger.log(`Model ${id} failed to load; falling back to ${DEFAULT_TRAINED_MODEL}`)
    return await bringUpClassifier(DEFAULT_TRAINED_MODEL)
  }
}

// Lazily bring up the model the first time it's needed (first settings push or
// first image). The background pushes settings on every worker start, so this
// still pre-warms before the first page image in practice.
const ensureUp = (): void => {
  if (bringingUp) return
  bringingUp = true
  enqueue(async () => {
    try {
      activeClassifier = await bringUpOrFallback(pendingModelId)
    } catch (error) {
      bringingUp = false // allow a later event to retry from scratch
      throw error
    }
  }).catch(() => undefined)
}

// Dispose the old model BEFORE loading the new one (never both resident). Safe
// because this runs on the same chain as predictions, so nothing is mid-predict.
const switchTo = async (id: TrainedModel): Promise<void> => {
  const previous = activeClassifier
  activeClassifier = null
  // A timed-out prediction may still be running on `previous`; let it settle so
  // we never dispose the model out from under an in-flight inference.
  await inFlightPredict
  previous?.dispose()
  try {
    activeClassifier = await bringUpOrFallback(id)
  } catch (error) {
    bringingUp = false // both the target and the default failed; let a retry rebuild
    throw error
  }
}

const loadImage = async (url: string, label: string): Promise<HTMLImageElement> => {
  const image: HTMLImageElement = new Image(IMAGE_SIZE, IMAGE_SIZE)

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Image load timeout ${label}`)), LOADING_TIMEOUT)
    image.crossOrigin = 'anonymous'
    image.onload = () => { clearTimeout(timer); resolve(image) }
    image.onerror = (err) => { clearTimeout(timer); reject(err) }
    image.src = url
  })
}

const classify = async (url: string, label: string): Promise<boolean> => {
  ensureUp()
  const image = await loadImage(url, label)

  return await enqueue(async () => {
    if (activeClassifier === null) throw new Error('Model is not loaded')
    const prediction = activeClassifier.predict(image, label)
    inFlightPredict = prediction.catch(() => undefined)
    return await withTimeout(prediction, PREDICTION_TIMEOUT, 'Prediction')
  })
}

chrome.runtime.onMessage.addListener((
  message: OffscreenRequest,
  _sender,
  sendResponse: (response: OffscreenClassifyResponse) => void
) => {
  if (message?.target !== 'offscreen') return

  if (message.type === 'SET_SETTINGS') {
    pendingStrictness = message.filterStrictness
    pendingModelId = message.trainedModel
    pendingLogging = message.logging
    if (pendingLogging) logger.enable()
    else logger.disable()

    ensureUp()
    enqueue(async () => {
      if (activeClassifier === null) return // ensureUp is loading pendingModelId already
      if (activeClassifier.trainedModel !== pendingModelId) await switchTo(pendingModelId)
      else activeClassifier.setSettings({ filterStrictness: pendingStrictness })
    }).catch(() => undefined)
    return
  }

  if (message.type === 'CLASSIFY') {
    classify(message.url, message.label ?? message.url)
      .then(result => sendResponse({ result }))
      .catch((error: Error) => sendResponse({ result: false, error: error?.message ?? String(error) }))

    return true // keep the message channel open for the async response
  }
})
