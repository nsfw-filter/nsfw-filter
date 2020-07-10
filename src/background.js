import 'regenerator-runtime/runtime'

import * as tf from '@tensorflow/tfjs'
import * as nsfwjs from 'nsfwjs'

tf.enableProdMode()

const IMAGE_SIZE = 224;
const FILTER_THRESHOLD = 0.75;
const FILTER_LIST = ["Hentai", "Porn", "Sexy"];

nsfwjs.load('../models/').then(model => {

  async function loadImage(url) {
    const image = new Image(IMAGE_SIZE, IMAGE_SIZE);
    return new Promise((resolve, reject) => {
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });
  }

  async function executeModel(url) {
    const image = await loadImage(url);

    // input pixels must be floats in (0,1) range instead of integers (0,255)
    // const tensor = tf
    //   .fromPixels(image)
    //   .toFloat()
    //   .div(255)
    //   .reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);

    // MobileNet V1: model.predict(tensor)
    // MobileNet V2: model.predict({ Placeholder: tensor })
    const prediction = model.classify(image, 1);

    const output = prediction;

    // const output_test = prediction[0].className; // [cat_probability, nocat_probability]
    // console.log('Prediction for %s', url, output);

    // if (output_test == 'Neutral') {
    //   console.log("Safe")
    // }

    return output;
  }

  chrome.runtime.onMessage.addListener((request, sender, callback) => {
    executeModel(request.url)
      .then(op => {
        if (FILTER_LIST.includes(op[0].className)) {
          console.log("EUREKA! EUREKA! EUREKA!")
          console.log(op[0].className, op[0].probability)
          return true;
        }
        else {
          return false;
        }
      })
      .then(result => callback({ result: result }))
      .catch(err => callback({ result: false, err: err.message }));

    return true; // needed to make the content script wait for the async processing to complete
  });

});