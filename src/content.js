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

"use strict";

// Set DEBUG to true to start logging in the console
const DEBUG = false;
if (!DEBUG) console.log = () => {};

import { getMemory, isValidHttpUrl } from './utils'

function clasifyImage(image) {
  if (!(image.__isNSFW || image.__isChecked)) {
    if (image.src && image.width > 64 && image.height > 64) {
      image.style.visibility = 'hidden'
      analyzeImage(image);
      image.__isChecked = true
    }

    // @todo handle unsafe images smaller than 64px
  }
}

// Calls the background script passing it the image URL
function analyzeImage(image) {
  console.log('analyze image %s', image.src);

  const message = { url: image.src }
  if (image.dataset && image.dataset.original) {
    message.lazyLoadUrl = isValidHttpUrl(image.dataset.original) ? image.dataset.original : `${window.location.origin}${image.dataset.original}`
  }

  chrome.runtime.sendMessage(message, response => {
    console.log(`Prediction result is ${response ? response.result : 'undefined'} for image ${response.url}`);
    if (response && response.result === false) {
      image.style.visibility = 'visible'
    } else {
      image.__isNSFW = true
    }
  });
}

const filterOnLoading = () => {
  const images = document.getElementsByTagName('img')
  for (let i = 0; i < images.length; i++) {
    clasifyImage(images[i])
  }
}

// Call function when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  filterOnLoading()

  // @refactor https://github.com/navendu-pottekkat/nsfw-filter/issues/19
  const timeArray = [0, 15, 50, 250, 500]
  for (let i = 0; i < timeArray.length; i++) {
    setTimeout(filterOnLoading, timeArray[i])
  }

  function callback(mutationsList, __observer) {
    for (let mutation of mutationsList) {
      if (mutation.target.tagName === 'IMG') {
        clasifyImage(mutation.target)
      }

      for (let i = 0; i < mutation.addedNodes.length; i++) {
        try {
          const images = mutation.addedNodes[i].getElementsByTagName('img')
          if (images.length) {
            for (let i = 0; i < images.length; i++) {
              clasifyImage(images[i])
            }
          }
        } catch (__err) {}
      }
    }
  }

  const observer = new MutationObserver(callback);
  observer.observe(document, { subtree: true, attributes: true, childList: true });
});

// // The script is executed when a user scrolls through a website on the tab that is active in the browser.
// // Call function when the user scrolls because most pages lazy load the images
// let isScrolling;
// document.addEventListener("scroll", () => {
//   clearTimeout(isScrolling);
//   isScrolling = setTimeout(() => { clasifyImages() }, 100);
// });

if (DEBUG) {
  getMemory()
}