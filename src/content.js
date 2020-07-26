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

// Set DEBUG to false to prevent logging in the console.
const DEBUG = true;
if (!DEBUG) console.log = () => {};

function clasifyImages() {
  const images = document.getElementsByTagName('img')
  for (let i = 0; i < images.length; i++) {
    if (!(images[i].__isNSFW || images[i].__isChecked)) {
      if (images[i].src && images[i].width > 64 && images[i].height > 64) {
        images[i].style.visibility = 'hidden'

        analyzeImage(images[i]);

        // lazy load handler
        const lazyLoadKeys = ['lazy', 'load']
        const isImageLazyLoad = lazyLoadKeys.find(key => JSON.stringify([images[i].src, images[i].classList, images[i].className]).includes(key))
        if (!isImageLazyLoad) {
          images[i].__isChecked = true
        }
      }

      // @todo handle unsafe images smaller than 64px
    }
  }
}

// Calls the background script passing it the image URL
function analyzeImage(image) {
  console.log('analyze image %s', image.src);
  chrome.runtime.sendMessage({ url: image.src, url2: image.src }, response => {
    console.log(`Prediction result is ${response ? response.result : 'undefined'} for image ${image.src}`);
    if (response && response.result === false) {
      image.style.visibility = 'visible'
    } else {
      image.__isNSFW = true
    }
  });
}

// Call function when DOM is loaded
window.addEventListener("load", () => {
  clasifyImages()

  // @todo hanlde with javascript render delay
  const timesToJSrun = [500, 1000, 2000, 3000]
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
