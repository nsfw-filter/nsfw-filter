import 'regenerator-runtime/runtime'

import * as nsfwjs from 'nsfwjs'

// Original code, commented to test a few things, the below code works!

// const img = document.getElementById('img')

// Load model from my S3.
// See the section hosting the model files on your site.

// nsfwjs.load().then(function (model) {
//   model.classify(img).then(function (predictions) {
//     // Classify the image
//     console.log('Predictions: ', predictions)
//   })
// })

// End of the working code

const IMAGE_SIZE = 224;
const CAT_THRESHOLD = 0.9;

async function loadImage(url) {
  const image = new Image(IMAGE_SIZE, IMAGE_SIZE);
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = url;
  });
}

async function executeModel(url) {
  const image = await loadImage(url);

  const model = await nsfwjs.load('../models/');

  // input pixels must be floats in (0,1) range instead of integers (0,255)
  // const tensor = tf
  //   .fromPixels(image)
  //   .toFloat()
  //   .div(255)
  //   .reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);

  // MobileNet V1: model.predict(tensor)
  // MobileNet V2: model.predict({ Placeholder: tensor })
  const prediction = model.classify(image);

  const output = prediction; // [cat_probability, nocat_probability]
  console.log('Prediction for %s', url, output);

  return output;
}

chrome.runtime.onMessage.addListener((request, sender, callback) => {
  executeModel(request.url)
    .then(result => callback({ result: result[0] > CAT_THRESHOLD }))
    .catch(err => callback({ result: false, err: err.message }));

  return true; // needed to make the content script wait for the async processing to complete
});

// Testing Script for the model

// async function app () {

// const model2 = await nsfwjs.load('../models/');
// const img = document.getElementById('img')

// const predictions = await model2.classify(img)
// console.log('Predictions: ', predictions)

// }

// app();