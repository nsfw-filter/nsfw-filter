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
    if (image.src && image.width > 64 && image.height > 64) {
      image.style.visibility = 'hidden'
      analyzeImage(image)
      image.__isChecked = true
    }

    // @todo handle unsafe images smaller than 64px
  }
}

// Calls the background script passing it the image URL
function analyzeImage (image) {
  console.log('analyze image %s', image.src)

  const message = { srcUrl: image.src }
  if (Object.values(image.dataset).length) {
    message.lazyUrls = Object.values(image.dataset).map(url => isValidHttpUrl(url) ? url : `${window.location.origin}${url}`)
  }

  chrome.runtime.sendMessage(message, response => {
    // In case of background worker not alive yet
    if (chrome.runtime.lastError) {
      if (!image.__reconectCount) {
        image.__reconectCount = 0
      }

      if (image.__reconectCount > 4) {
        image.style.visibility = 'visible'
        image.__isChecked = true
        console.log(`Cannot connect to background worker for ${image.src} image, mark image as checked`)
      } else {
        image.__reconectCount++
        console.log(`Cannot connect to background worker for ${image.src} image, attempt ${image.__reconectCount}`)
        setTimeout(() => analyzeImage(image), 142)
      }
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

const filterOnLoading = () => {
  const images = document.getElementsByTagName('img')
  for (let i = 0; i < images.length; i++) {
    clasifyImage(images[i])
  }
}

// Call function when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // In some cases MutationObserver cannot immediately catch DOM mutations after DOM loaded
  filterOnLoading()

  // @refactor https://github.com/navendu-pottekkat/nsfw-filter/issues/19
  const timeArray = [0, 15, 50, 100]
  for (let i = 0; i < timeArray.length; i++) {
    setTimeout(filterOnLoading, timeArray[i])
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

  setTimeout(() => {
    const observer = new MutationObserver(callback)
    observer.observe(document, { subtree: true, attributes: true, childList: true })
  }, 0)
})
