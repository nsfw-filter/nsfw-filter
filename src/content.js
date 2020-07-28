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

function clasifyImages() {
  const images = document.getElementsByTagName('img')
  for (let i = 0; i < images.length; i++) {
    if (!(images[i].__isNSFW || images[i].__isChecked)) {
      if (images[i].src && images[i].width > 64 && images[i].height > 64) {
        images[i].style.visibility = 'hidden'
        analyzeImage(images[i]);
        images[i].__isChecked = true
      }

      // @todo handle unsafe images smaller than 64px
    }
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_err) {
    return false;
  }
}

// Calls the background script passing it the image URL
function analyzeImage(image) {
  console.log('analyze image %s', image.src);

  const message = { url: image.src }
  if (image.dataset && image.dataset.original) {
    message.lazyLoadUrl = isValidUrl(image.dataset.original) ? image.dataset.original : `${window.location.origin}${image.dataset.original}`
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

// Call function when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  clasifyImages()

  // @refactor hanlde with javascript render delay
  const timesToJSrun = [500, 1000, 2000, 3000, 4000, 5000]
  for (let i = 0; i < timesToJSrun.length; i++) {
    setTimeout(() => { clasifyImages() }, timesToJSrun[i]);
  }
});

// The script is executed when a user scrolls through a website on the tab that is active in the browser.
// Call function when the user scrolls because most pages lazy load the images
let isScrolling;
document.addEventListener("scroll", () => {
  clearTimeout(isScrolling);
  isScrolling = setTimeout(() => { clasifyImages() }, 100);
});
