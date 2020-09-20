import * as tf from '@tensorflow/tfjs'
import { load as loadModel } from '@nsfw-filter/nsfwjs'

import { Memory } from '../utils/Memory'
import { promiseAny } from '../utils/promiseSomeRace'
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
      const { url, lazyUrls } = request

      model.predictImage(url)
        .then(result => {
        // Lazy loading handler, if srcUrl (main url) isn't a NSFW, we wait first NSFW prediction result for all lazy load urls
          if (!result && Array.isArray(lazyUrls) && lazyUrls.length > 0) {
          // @TODO @refactor Promise.any(), It seems like esnext.promise.any is not there yet
            return promiseAny(lazyUrls.map(async (url: string) => await model.predictImage(url)))
          } else {
            callback(new PredictionResponse(result, url))
          }
        })
        .catch(err => callback(new PredictionResponse(false, url, err.message)))
        .then(result => callback(new PredictionResponse(Boolean(result), `lazy ${lazyUrls?.join()}`)))
        .catch(err => callback(new PredictionResponse(false, `lazy ${lazyUrls?.join()}`, err.message)))

      return true // https://stackoverflow.com/a/56483156
    })
  })
  .catch(err => { throw err })
