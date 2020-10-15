import { load as loadModel } from '@nsfw-filter/nsfwjs'
import { enableProdMode } from '@tensorflow/tfjs'
import { createStore } from 'redux'

import { SettingsActionTypes } from '../popup/redux/actions/settings'
import { StatisticsActionTypes } from '../popup/redux/actions/statistics'
import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer, RootState } from '../popup/redux/reducers'
import { ILogger, Logger } from '../utils/Logger'
import { Memory } from '../utils/Memory'
import { PredictionRequest, PredictionResponse } from '../utils/messages'

import { modelSettingsType } from './Prediction/Model'
import { PredictionQueue } from './Prediction/PredictionQueue'

export type IReduxedStorage = {
  getState: () => RootState
  dispatch: (action: SettingsActionTypes | StatisticsActionTypes) => void // returns dispatchedAction
}

export type loadType = {
  logger: ILogger
  store: IReduxedStorage
  settings: modelSettingsType
}

enableProdMode()
let attempts = 0

const load = ({ logger, store, settings }: loadType): void => {
  const MODEL_PATH = '../models/'

  loadModel(MODEL_PATH)
    .then(NSFWJSModel => {
      const pQueue = new PredictionQueue(NSFWJSModel, logger, store, settings)

      chrome.runtime.onMessage.addListener((request: PredictionRequest, sender, callback: (value: PredictionResponse) => void) => {
        if (request.type === 'SIGN_CONNECT') return

        const { url } = request
        pQueue.predict(url, sender.tab?.id)
          .then(result => callback(new PredictionResponse(result, url)))
          .catch(err => callback(new PredictionResponse(false, url, err.message)))

        return true // https://stackoverflow.com/a/56483156
      })

      chrome.tabs.onRemoved.addListener(tabId => pQueue.clearByTabId(tabId))

      chrome.runtime.onConnect.addListener(port => port.onDisconnect.addListener(() => {
        const { logging, filteringGif, filterStrictness, concurrency } = store.getState().settings

        logging ? logger.enable() : logger.disable()
        pQueue.setSettings({ filteringGif, filterStrictness, concurrency: Number(concurrency) })
      }))
    })
    .catch(error => {
      logger.error(error)
      if (attempts < 5) setTimeout(load, 200)

      logger.log(`Reload model, attempt: ${attempts}`)
    })
}

const init = async (): Promise<void> => {
  attempts++
  const store = await createChromeStore({ createStore })(rootReducer)
  const { logging, filteringGif, filterStrictness, concurrency } = store.getState().settings

  const logger = new Logger()
  if (logging === true) logger.enable()

  new Memory(logger).start()
  load({ logger, store, settings: { filteringGif, filterStrictness, concurrency: Number(concurrency) } })
}

init()
