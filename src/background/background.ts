/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import { enableProdMode } from '@tensorflow/tfjs'
import { load as loadModel } from 'nsfwjs'
import { createStore } from 'redux'

import { SettingsActionTypes } from '../popup/redux/actions/settings'
import { StatisticsActionTypes } from '../popup/redux/actions/statistics'
import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer, RootState } from '../popup/redux/reducers'
import { ILogger, Logger } from '../utils/Logger'
import { PredictionRequest, PredictionResponse } from '../utils/messages'

import { Model, ModelSettings } from './Model'
import { DEFAULT_TAB_ID, TabIdUrl } from './Queue/QueueBase'
import { QueueWrapper as Queue } from './Queue/QueueWrapper'

// @TODO refactor

export type IReduxedStorage = {
  getState: () => RootState
  dispatch: (action: SettingsActionTypes | StatisticsActionTypes) => Promise<void> // returns dispatchedAction
}

export type loadType = {
  logger: ILogger
  store: IReduxedStorage
  modelSettings: ModelSettings
}

enableProdMode()
let attempts = 0

const _buildTabIdUrl = (tab: chrome.tabs.Tab): TabIdUrl => {
  const tabIdUrl = {
    tabId: tab?.id ? tab.id : DEFAULT_TAB_ID,
    tabUrl: tab?.url ? tab?.url : `${DEFAULT_TAB_ID}`
  }

  return tabIdUrl
}

const load = ({ logger, store, modelSettings }: loadType): void => {
  const MODEL_PATH = '../models/'

  // @ts-expect-error
  loadModel(MODEL_PATH, { type: 'graph' })
    .then(NSFWJSModel => {
      const model = new Model(NSFWJSModel, logger, modelSettings)
      const queue = new Queue(model, logger, store)

      // Event when content sends request to filter image
      chrome.runtime.onMessage.addListener((request: PredictionRequest, sender, callback: (value: PredictionResponse) => void) => {
        if (request.type === 'SIGN_CONNECT') return

        const { url } = request
        const tabIdUrl = _buildTabIdUrl(sender.tab as chrome.tabs.Tab)
        queue.predict(url, tabIdUrl)
          .then(result => callback(new PredictionResponse(result, url)))
          .catch(err => callback(new PredictionResponse(false, url, err.message)))

        return true // https://stackoverflow.com/a/56483156
      })

      // When user opend new tab
      chrome.tabs.onCreated.addListener(function (tab) {
        const tabIdUrl = _buildTabIdUrl(tab)
        queue.addTabIdUrl(tabIdUrl)
      })

      // When user closed tab
      chrome.tabs.onRemoved.addListener(function (tabId) {
        queue.clearByTabId(tabId)
      })

      // When user went to new url in same domain
      chrome.tabs.onUpdated.addListener(function (_tabId, changeInfo, tab) {
        if (changeInfo.status === 'loading') {
          const tabIdUrl = _buildTabIdUrl(tab)
          queue.updateTabIdUrl(tabIdUrl)
        }
      })

      // When user selected tab as active
      chrome.tabs.onActivated.addListener(function (activeInfo) {
        queue.setActiveTabId(activeInfo.tabId)
      })

      // When user closed popup window
      chrome.runtime.onConnect.addListener(port => port.onDisconnect.addListener(() => {
        const { logging, filterStrictness } = store.getState().settings

        logging ? logger.enable() : logger.disable()
        model.setSettings({ filterStrictness })

        queue.clearCache()
      }))
    })
    .catch(error => {
      logger.error(error)
      attempts++
      if (attempts < 5) setTimeout(load, 200)

      logger.log(`Reload model, attempt: ${attempts}`)
    })
}

const init = async (): Promise<void> => {
  const store = await createChromeStore({ createStore })(rootReducer)
  const { logging, filterStrictness } = store.getState().settings

  const logger = new Logger()
  if (logging === true) logger.enable()

  load({ logger, store, modelSettings: { filterStrictness } })
}

init()
