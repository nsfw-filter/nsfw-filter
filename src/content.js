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

'use strict'

import { isValidHttpUrl } from './utils'

function clasifyImage (image) {
  if (!(image.__isNSFW || image.__isChecked)) {
    if (image.src) {
      image.style.visibility = 'hidden'
      analyzeImage(image)
      image.__isChecked = true
    }
  }
}

// Calls the background script passing it the image URL
function analyzeImage (image) {
  console.log('analyze image %s', image.src)

  // raw image has invalid url with slashes, for google images case
  if (image.src.match(/\/\/\/\/\//)) {
    clearTimeout(image.__fullRawImageTimer)
    image.__fullRawImageTimer = setTimeout(() => analyzeImage(image), 100)
  } else {
    const message = { srcUrl: image.src }
    if (Object.values(image.dataset).length) {
      message.lazyUrls = Object.values(image.dataset).map(url => {
        if (url && url.length > 5) {
          return isValidHttpUrl(url) ? url : `${window.location.origin}${url}`
        }
      }).filter(Boolean)
    }

    chrome.runtime.sendMessage(message, response => {
      // In case of background worker not alive yet
      if (chrome.runtime.lastError) {
        console.log(`Cannot connect to background worker for ${image.src} image, attempt ${image.__reconectCount}`)
        image.__reconectCount++
        clearTimeout(image.__reconectTimer)
        image.__reconectTimer = setTimeout(() => analyzeImage(image), 100)
      } else {
        console.log(`Prediction result is ${response ? response.result : 'undefined'} for image ${response.url ? response.url : 'undefined'}, error: ${response.err ? response.err : 'none'}`)
        if (response && response.result === false) {
          image.style.visibility = 'visible'
        } else {
          image.__isNSFW = true
        }
      }
    })
  }
}

function callback (mutationsList, __observer) {
  for (const mutation of mutationsList) {
    if (mutation.target.tagName === 'IMG') {
      clasifyImage(mutation.target)
    }

    const images = mutation.target.getElementsByTagName('img')
    if (images.length) {
      for (let i = 0; i < images.length; i++) {
        clasifyImage(images[i])
      }
    }
  }
}
const observer = new MutationObserver(callback)

if (document.readyState === 'loading') {
  observer.observe(document, { subtree: true, attributes: true, childList: true })
}
