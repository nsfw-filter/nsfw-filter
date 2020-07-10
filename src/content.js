/**
* @license
* Copyright 2020 Navendu Pottekkat. All Rights Reserved.
* Licensed under the GNU General Public License v3.0
* License copy at https://github.com/navendu-pottekkat/nsfw-blocker/blob/master/LICENSE
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

// Set DEBUG to 0 to prevent logging in the console.
// Used for DEBUGGING purposes.
const DEBUG = 1;
if (!DEBUG) console.log = () => { };


// The script is executed when a user scrolls through a website on the tab that is active in the browser.
let isScrolling;
let images = [...document.getElementsByTagName('img')];

function clasifyImages() {
  /*
  Classifies images and calls all the helper functions.
  */
  [...images, ...document.getElementsByTagName('img')].unique().filter(validImage).forEach(analyzeImage);
}

function validImage(image) {
  /*
  Checks if the image is of a certain height and width and check if the image has already been replaced,
  preventing infinite loops.
  */
  const valid = image.src &&
    image.width > 64 && image.height > 64 &&
    !image.dataset.isReplaced;
  console.log('image %s valid', image.src, valid);
  return valid;
}

function analyzeImage(image) {
  /*
  Calls the background script passing it the image URL.
  */
  console.log('analyze image %s', image.src);
  chrome.runtime.sendMessage({ url: image.src }, response => {
    console.log('prediction for image %s', image.src, response);
    console.log(image);
    if (response && response.result === true) {
      /*
      If the image should be filtered, it replaces the NSFW 
      image with a random image from https://unsplash.com
      */
      const replacedImageSrc = "https://source.unsplash.com/random/" + image.width + "x" + image.height;
      image.src = replacedImageSrc;
      image.srcset = "";
      image.dataset.filtered = true; // sets filterd to true so that they are not analyzed again
      image.dataset.isReplaced = true; // sets isReplaced to true so that they are not analyzed again
    }
  });
}

document.addEventListener("scroll", (images) => {
  /*
  Call function when scrolling and timeout after scrolling stops.
  */
  clearTimeout(isScrolling);
  isScrolling = setTimeout(() => { clasifyImages() }, 100);
});

Array.prototype.unique = function () {
  return this.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete' && tab.active) {
    /*
    Run classification on the active tab.
    */
    clasifyImages();
  }
})