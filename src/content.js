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

const images = document.getElementsByTagName('img');

function clasifyImages() {
  // Hide every image until figure out its safety
  for (let i = 0; i < images.length; i++) {
    if (!images[i].__isPreChecked) {
      images[i].__isPreChecked = true

      images[i].style.visibility = 'hidden'
    }
  }

  for (let i = 0; i < images.length; i++) {
    if (!images[i].__isChecked) {
      images[i].__isChecked = true

      if (images[i].src && images[i].width > 64 && images[i].height > 64) {
        analyzeImage(images[i]);
      } else {
        images[i].style.visibility = 'visible'
      }
    }
  }
}

// Calls the background script passing it the image URL
function analyzeImage(image) {
  console.log('analyze image %s', image.src);
  chrome.runtime.sendMessage({ url: image.src }, response => {
    if (response && response.result === false) {
      console.log(`Prediction result is ${response.result} for image ${image.src}`);
      image.style.visibility = 'visible'
    }
  });
}

// Call function when DOM is loaded
document.addEventListener("DOMContentLoaded", () => { clasifyImages() });

// Call function when DOM is loaded with images, just for sure
document.addEventListener("load", () => { clasifyImages() });

// The script is executed when a user scrolls through a website on the tab that is active in the browser.
let isScrolling;
// Call function when the user scrolls because most pages lazy load the images
document.addEventListener("scroll", () => {
  clearTimeout(isScrolling);
  isScrolling = setTimeout(() => { clasifyImages() }, 100);
});
