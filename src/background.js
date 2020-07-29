/**
* @license
* Copyright 2020 Navendu Pottekkat. All Rights Reserved.
* Licensed under the GNU General Public License v3.0
* License copy at https://github.com/navendu-pottekkat/nsfw-filter/blob/master/LICENSE
*
* =======================================================================================
*
* Permissions of this strong copyleft license are conditioned on making
* available complete source code of licensed works and modifications,
* which include larger works using a licensed work,
* under the same license. Copyright and license notices must be preserved.
* Contributors provide an express grant of patent rights.
*
* =======================================================================================
*/

import 'regenerator-runtime/runtime'

import * as tf from '@tensorflow/tfjs'
import * as nsfwjs from 'nsfwjs'
import { promiseSome, DEBUG, FILTER_LIST } from './utils'

// Enable production mode in TensorFlow
if (!DEBUG) {
  tf.enableProdMode()
}

const IMAGE_SIZE = 224 // nsfwjs model used here takes input tensors as 224x224
const MODEL_PATH = '../models/' // the model is stored as a web accessible resource

nsfwjs.load(MODEL_PATH).then(model => {
  /*
  This function loads the nsfwjs model to memory and prepares it for making predictions.
  Once the model is loaded, it will load the images and make predictions.
  */
  async function loadImage (url) {
    /*
    This function loads the image for passing to the model.
    */
    const image = new Image(IMAGE_SIZE, IMAGE_SIZE)
    return new Promise((resolve, reject) => {
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = (err) => reject(err)
      image.src = url
    })
  }

  async function executeModel (url) {
    /*
    Executes the model and returns predicitions.
    */
    const image = await loadImage(url)
    const prediction = model.classify(image, 1) // Change the second parameter to change the number of top predicitions returned
    return prediction
  }

  chrome.runtime.onMessage.addListener((request, __sender, callback) => {
    executeModel(request.srcUrl)
      .then(op => {
        const result = op[0] && op[0].className && FILTER_LIST.includes(op[0].className)

        // lazy loading handler, if srcUrl (main url) isn't a NSFW, we wait first NSFW prediction result for all lazy load urls
        if (!result && request.lazyUrls && request.lazyUrls.length) {
          return promiseSome(request.lazyUrls.map(url => executeModel(url)))
        } else {
          callback({ result, url: `url ${request.srcUrl}` })
        }
      })
      .catch(err => callback({ result: false, url: `url ${request.srcUrl}`, err: err.message }))
      .then(result => callback({ result, url: `lazy urls ${request.lazyUrls ? request.lazyUrls.join() : 'none'}` }))
      .catch(err => callback({ result: false, url: `lazy urls ${request.lazyUrls ? request.lazyUrls.join() : 'none'}`, err: err.message }))

    return true // https://stackoverflow.com/a/56483156
  })
})
