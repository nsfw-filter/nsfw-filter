import * as tf from '@tensorflow/tfjs'
import { load as loadModel } from '@nsfw-filter/nsfwjs'

import { Memory } from '../utils/Memory'
import { Model } from './Model'
import { Logger } from '../utils/Logger'
import { PredictionRequest, PredictionResponse } from '../utils/messages'

const logger = new Logger()
new Memory(logger).start()
tf.enableProdMode()

const MODEL_PATH = '../models/'

loadModel(MODEL_PATH)
  .then(NSFWJSModel => {
    const model = new Model(NSFWJSModel, logger)

    chrome.runtime.onMessage.addListener((request: PredictionRequest, _sender, callback: (value: PredictionResponse) => void) => {
      const { url } = request

      model.predictImage(url)
        .then(result => callback(new PredictionResponse(result, url)))
        .catch(err => callback(new PredictionResponse(false, url, err.message)))

      return true // https://stackoverflow.com/a/56483156
    })
  })
  .catch(err => { throw err })
