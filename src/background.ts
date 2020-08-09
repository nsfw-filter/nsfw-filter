import 'regenerator-runtime/runtime'
import * as tf from '@tensorflow/tfjs'
import * as nsfwjs from 'nsfwjs'

import { promiseSome, DEBUG, FILTER_LIST, predictionType, notEmpty, getMemory } from './utils'
import { messageType } from './content'

// Enable production mode in TensorFlow
if (!DEBUG) {
  tf.enableProdMode()
} else {
  getMemory()
}

const IMAGE_SIZE = 224 // nsfwjs model used here takes input tensors as 224x224

// This function loads the image for passing to the model.
const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const image: HTMLImageElement = new Image(IMAGE_SIZE, IMAGE_SIZE)

  return await new Promise((resolve, reject) => {
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = (err) => reject(err)
    image.src = url
  })
}

const MODEL_PATH = '../models/' // the model is stored as a web accessible resource

// This function loads the nsfwjs model to memory and prepares it for making predictions.
// Once the model is loaded, it will load the images and make predictions.
nsfwjs.load(MODEL_PATH).then(model => {
  // Executes the model and returns predicitions.
  const executeModel = async (url: string): Promise<predictionType[]> => {
    const image = await loadImage(url)

    return await model.classify(image, 1) // Change the second parameter to change the number of top predicitions returned
  }

  chrome.runtime.onMessage.addListener((request: messageType, _sender, callback) => {
    executeModel(request.srcUrl)
      .then(op => {
        const result = op.length > 0 && FILTER_LIST.includes(op[0].className)

        // lazy loading handler, if srcUrl (main url) isn't a NSFW, we wait first NSFW prediction result for all lazy load urls
        if (!result && notEmpty(request.lazyUrls) && request.lazyUrls.length > 0) {
          return promiseSome(request.lazyUrls.map(async (url: string) => await executeModel(url)))
        } else {
          callback({ result, url: `url ${request.srcUrl}` })
        }
      })
      .catch(err => callback({ result: false, url: `url ${request.srcUrl}`, err: err.message }))
      .then(result => callback({ result, url: `lazy urls ${request.lazyUrls?.join()}` }))
      .catch(err => callback({ result: false, url: `lazy urls ${request.lazyUrls?.join()}`, err: err.message }))

    return true // https://stackoverflow.com/a/56483156
  })
}, () => console.log('NSFWJS model didnt load'))
