import * as tf from '@tensorflow/tfjs'
import * as nsfwjs from 'nsfwjs'

// const model = nsfwjs.load('./')

const img = document.getElementById('img')

// Load model from my S3.
// See the section hosting the model files on your site.
nsfwjs.load().then(function (model) {
  model.classify(img).then(function (predictions) {
    // Classify the image
    console.log('Predictions: ', predictions)
  })
})