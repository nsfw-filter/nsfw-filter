import * as tf from '@tensorflow/tfjs'
import { load as loadModel } from '@nsfw-filter/nsfwjs'

import { Memory } from '../utils/Memory'
import { PredictionQueue } from './Prediction/PredictionQueue'
import { Logger } from '../utils/Logger'
import { PredictionRequest, PredictionResponse } from '../utils/messages'

const logger = new Logger()
new Memory(logger).start()
tf.enableProdMode()

let attempts = 0
const MODEL_PATH = '../models/'

const init = (): void => {
  attempts++

  loadModel(MODEL_PATH)
    .then(NSFWJSModel => {
      const pQueue = new PredictionQueue(NSFWJSModel, logger)

      chrome.runtime.onMessage.addListener((request: PredictionRequest, sender, callback: (value: PredictionResponse) => void) => {
        const { url } = request

        pQueue.predict(url, sender.tab?.id)
          .then(result => callback(new PredictionResponse(result, url)))
          .catch(err => callback(new PredictionResponse(false, url, err.message)))

        return true // https://stackoverflow.com/a/56483156
      })

      chrome.tabs.onRemoved.addListener(tabId => pQueue.clearByTabId(tabId))
    })
    .catch(_err => {
      logger.log(`Reload model, attempt: ${attempts}`)
      if (attempts < 5) setTimeout(init, 200)
    })
}

init()
