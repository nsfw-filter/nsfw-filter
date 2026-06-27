/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import { createStore } from 'redux'

import { SettingsActionTypes } from '../popup/redux/actions/settings'
import { StatisticsActionTypes } from '../popup/redux/actions/statistics'
import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer, RootState } from '../popup/redux/reducers'
import { ILogger, Logger } from '../utils/Logger'
import { PredictionRequest, PredictionResponse } from '../utils/messages'

import { OffscreenModel } from './OffscreenModel'
import { DEFAULT_TAB_ID, TabIdUrl } from './Queue/QueueBase'
import { QueueWrapper as Queue } from './Queue/QueueWrapper'

// In Manifest V3 the background page is a non-persistent service worker with no
// DOM and no access to TensorFlow.js' DOM/eval requirements. This worker keeps
// all of the orchestration (queue, cache, per-tab tracking, statistics, redux)
// and delegates the actual image download + classification to an offscreen
// document. Event listeners are registered synchronously at the top level so
// the worker can wake up and handle events after being terminated.

export type IReduxedStorage = {
  getState: () => RootState
  dispatch: (action: SettingsActionTypes | StatisticsActionTypes) => Promise<void> // returns dispatchedAction
}

type Runtime = {
  logger: ILogger
  store: IReduxedStorage
  model: OffscreenModel
  queue: Queue
}

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen.html'

const _buildTabIdUrl = (tab?: chrome.tabs.Tab): TabIdUrl => {
  return {
    tabId: tab?.id ? tab.id : DEFAULT_TAB_ID,
    tabUrl: tab?.url ? tab.url : `${DEFAULT_TAB_ID}`
  }
}

// --- Offscreen document lifecycle -----------------------------------------

let creatingOffscreen: Promise<void> | null = null

const hasOffscreenDocument = async (): Promise<boolean> => {
  const runtime = chrome.runtime as any
  if (typeof runtime.getContexts === 'function') {
    const contexts = await runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })
    return contexts.length > 0
  }

  const offscreen = (chrome as any).offscreen
  if (offscreen !== undefined && typeof offscreen.hasDocument === 'function') {
    return await offscreen.hasDocument()
  }

  return false
}

const ensureOffscreenDocument = async (): Promise<void> => {
  if (await hasOffscreenDocument()) return

  if (creatingOffscreen !== null) {
    await creatingOffscreen
    return
  }

  creatingOffscreen = ((chrome as any).offscreen).createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['DOM_SCRAPING'],
    justification: 'Load images into an <img> element and run the TensorFlow.js NSFW classification model, which require DOM APIs unavailable in a service worker.'
  })

  try {
    await creatingOffscreen
  } finally {
    creatingOffscreen = null
  }
}

// --- Lazy runtime initialisation ------------------------------------------

let runtimePromise: Promise<Runtime> | null = null

const initRuntime = async (): Promise<Runtime> => {
  await ensureOffscreenDocument()

  const store = await createChromeStore({ createStore })(rootReducer)
  const { logging, filterStrictness } = store.getState().settings

  const logger = new Logger()
  if (logging === true) logger.enable()

  const model = new OffscreenModel()
  model.setSettings(filterStrictness, logging)

  const queue = new Queue(model, logger, store)

  // The worker may have been restarted, losing the per-tab map. Reseed it from
  // the currently open tabs so in-flight prediction guards stay accurate.
  try {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => chrome.tabs.query({}, resolve))
    for (const tab of tabs) queue.addTabIdUrl(_buildTabIdUrl(tab))
  } catch (error) {
    logger.error(error as Error)
  }

  return { logger, store, model, queue }
}

const getRuntime = async (): Promise<Runtime> => {
  if (runtimePromise === null) runtimePromise = initRuntime()

  try {
    return await runtimePromise
  } catch (error) {
    // Allow a later event to retry from scratch instead of caching a failure.
    runtimePromise = null
    throw error
  }
}

// --- Event listeners (registered synchronously) ---------------------------

// Image classification requests coming from content scripts.
chrome.runtime.onMessage.addListener((request: PredictionRequest, sender, sendResponse: (value: PredictionResponse) => void) => {
  // Messages addressed to the offscreen document are handled there, not here.
  if ((request as any)?.target === 'offscreen') return
  if (request?.type === 'SIGN_CONNECT') return
  if (typeof request?.url !== 'string') return

  const { url } = request

  getRuntime()
    .then(({ queue }) => {
      const tabIdUrl = _buildTabIdUrl(sender.tab)
      // Guarantee the requesting tab is known even after a worker restart.
      queue.addTabIdUrl(tabIdUrl)

      queue.predict(url, tabIdUrl)
        .then(result => sendResponse(new PredictionResponse(result, url)))
        .catch(err => sendResponse(new PredictionResponse(false, url, err.message)))
    })
    .catch(err => sendResponse(new PredictionResponse(false, url, err?.message)))

  return true // https://stackoverflow.com/a/56483156
})

// When user opened a new tab
chrome.tabs.onCreated.addListener((tab) => {
  getRuntime().then(({ queue }) => queue.addTabIdUrl(_buildTabIdUrl(tab))).catch(() => undefined)
})

// When user closed a tab
chrome.tabs.onRemoved.addListener((tabId) => {
  getRuntime().then(({ queue }) => queue.clearByTabId(tabId)).catch(() => undefined)
})

// When user went to a new url in the same tab
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    getRuntime().then(({ queue }) => queue.updateTabIdUrl(_buildTabIdUrl(tab))).catch(() => undefined)
  }
})

// When user selected a tab as active
chrome.tabs.onActivated.addListener((activeInfo) => {
  getRuntime().then(({ queue }) => queue.setActiveTabId(activeInfo.tabId)).catch(() => undefined)
})

// When the popup window is closed, reload settings and clear the cache so new
// strictness/logging settings take effect immediately.
chrome.runtime.onConnect.addListener(port => port.onDisconnect.addListener(() => {
  getRuntime()
    .then(({ store, logger, model, queue }) => {
      const { logging, filterStrictness } = store.getState().settings

      logging ? logger.enable() : logger.disable()
      model.setSettings(filterStrictness, logging)

      queue.clearCache()
    })
    .catch(() => undefined)
}))

// Make sure the offscreen document and runtime exist as soon as the worker
// starts (install / browser startup / wake-up).
chrome.runtime.onInstalled.addListener(() => { void getRuntime() })
chrome.runtime.onStartup.addListener(() => { void getRuntime() })
void getRuntime()
