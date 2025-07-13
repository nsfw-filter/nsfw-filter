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
  modelSettings: ModelSettings & { trainedModel: 'MobileNetV2' | 'MobileNetV2Mid' | 'InceptionV3' }
}

enableProdMode()
let attempts = 0
let currentModelType: 'MobileNetV2' | 'MobileNetV2Mid' | 'InceptionV3' = 'MobileNetV2'

const _buildTabIdUrl = (tab: chrome.tabs.Tab): TabIdUrl => {
  const tabIdUrl = {
    tabId: tab?.id ? tab.id : DEFAULT_TAB_ID,
    tabUrl: tab?.url ? tab?.url : `${DEFAULT_TAB_ID}`
  }

  return tabIdUrl
}

const load = ({ logger, store, modelSettings }: loadType): void => {
  const { trainedModel, filterStrictness } = modelSettings

  let modelPath: string
  let modelOptions: any = {}

  // Set the correct model path based on selected model
  switch (trainedModel) {
    case 'MobileNetV2':
      modelPath = '../models/mobilenet_v2/'
      break
    case 'MobileNetV2Mid':
      modelPath = '../models/mobilenet_v2_mid/'
      modelOptions = { type: 'graph' }  // Graph model type
      break
    case 'InceptionV3':
      modelPath = '../models/inception_v3/'
      modelOptions = { size: 299 }  // InceptionV3 requires 299x299 input
      break
    default:
      modelPath = '../models/mobilenet_v2/'
      break
  }

  logger.log(`============================================`)
  logger.log(`Loading model: ${trainedModel} from ${modelPath}`)
  logger.log(`Model options: ${JSON.stringify(modelOptions)}`)
  logger.log(`Settings: topK=${modelSettings.topKPredictions}, overlay=${modelSettings.showProbabilityOverlay}`)
  logger.log(`============================================`)

  loadModel(modelPath, modelOptions)
    .then(NSFWJSModel => {
      logger.log(`✅ Model ${trainedModel} loaded successfully!`)
      logger.log(`Model info: ${NSFWJSModel.model ? 'TensorFlow model loaded' : 'Model object created'}`)
      const model = new Model(NSFWJSModel, logger, modelSettings)
      const queue = new Queue(model, logger, store)

      // Event when content sends request to filter image
      chrome.runtime.onMessage.addListener((request: PredictionRequest, sender, callback: (value: PredictionResponse) => void) => {
        if (request.type === 'SIGN_CONNECT') return

        const { url } = request
        const tabIdUrl = _buildTabIdUrl(sender.tab as chrome.tabs.Tab)
        
        // Check if overlay is enabled to decide which prediction method to use
        const { showProbabilityOverlay } = store.getState().settings
        
        if (showProbabilityOverlay) {
          // Use the direct model prediction for overlay (bypass queue for now)
          const image = new Image()
          image.crossOrigin = 'anonymous'
          image.onload = async () => {
            try {
              const { result, predictions } = await model.predictImageWithScores(image, url)
              callback(new PredictionResponse(result, url, undefined, predictions))
            } catch (err) {
              callback(new PredictionResponse(false, url, (err as Error).message))
            }
          }
          image.onerror = () => {
            callback(new PredictionResponse(false, url, 'Image load error'))
          }
          image.src = url
        } else {
          // Use the normal queue system
          queue.predict(url, tabIdUrl)
            .then(result => callback(new PredictionResponse(result, url)))
            .catch(err => callback(new PredictionResponse(false, url, err.message)))
        }

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
        const { logging, filterStrictness, trainedModel, topKPredictions, showProbabilityOverlay, classThresholds } = store.getState().settings

        // Check if model type has changed
        if (currentModelType !== trainedModel) {
          logger.log(`🔄 MODEL CHANGE DETECTED: ${currentModelType} → ${trainedModel}`)
          currentModelType = trainedModel
          logger.log(`🔄 Reloading model in 100ms...`)
          // Reload the model with new type
          setTimeout(() => {
            load({ logger, store, modelSettings: { filterStrictness, trainedModel, topKPredictions, showProbabilityOverlay, classThresholds } })
          }, 100)
          return
        }

        logging ? logger.enable() : logger.disable()
        model.setSettings({ filterStrictness, modelType: trainedModel, topKPredictions, showProbabilityOverlay, classThresholds })

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
  const { logging, filterStrictness, trainedModel, topKPredictions, showProbabilityOverlay, classThresholds } = store.getState().settings

  const logger = new Logger()
  if (logging === true) logger.enable()

  // Set the current model type
  currentModelType = trainedModel

  load({ logger, store, modelSettings: { filterStrictness, trainedModel, topKPredictions, showProbabilityOverlay, classThresholds } })
}

init()
