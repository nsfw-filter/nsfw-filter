import * as tf from '@tensorflow/tfjs'
import { load as loadModel } from '@nsfw-filter/nsfwjs'

import { Memory } from '../utils/Memory'
import { promiseSomeRace } from '../utils/promiseSomeRace'
import { requestType } from '../utils/types'
import { Model } from './Model'
import { Logger } from '../utils/Logger'

const logger = new Logger()
new Memory(logger).start()
tf.enableProdMode()

const MODEL_PATH = '../models/'

loadModel(MODEL_PATH).then(NSFWJSModel => {
  const model = new Model(NSFWJSModel, logger)

  chrome.runtime.onMessage.addListener((request: requestType, _sender, callback) => {
    const { url, lazyUrls } = request

    model.predictImage(url)
      .then(result => {
        // Lazy loading handler, if srcUrl (main url) isn't a NSFW, we wait first NSFW prediction result for all lazy load urls
        if (!result && lazyUrls != null && lazyUrls.length > 0) {
          return promiseSomeRace(lazyUrls.map(async (url: string) => await model.predictImage(url)))
        } else {
          callback(Model.buildMsg(result, url))
        }
      })
      .catch(err => callback(Model.buildMsg(false, url, err.message)))
      .then(result => callback(Model.buildMsg(Boolean(result), `lazy ${lazyUrls?.join()}`)))
      .catch(err => callback(Model.buildMsg(false, `lazy ${lazyUrls?.join()}`, err.message)))

    return true // https://stackoverflow.com/a/56483156
  })
}, (err) => { throw err })
