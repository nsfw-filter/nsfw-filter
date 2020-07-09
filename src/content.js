const DEBUG = 1;
if (!DEBUG) console.log = () => {};

let isScrolling;
let images = [...document.getElementsByTagName('img')];

function clasifyImages() {
  [...images, ...document.getElementsByTagName('img')].unique().forEach(analyzeImage);  
}

function validImage(image) {
  const valid = image.src &&
        image.width > 64 && image.height > 64 &&
        !image.dataset.catReplaced;
  console.log('image %s valid', image.src, valid);
  return valid;
}

function analyzeImage(image) {
  console.log('analyze image %s', image.src);

  chrome.runtime.sendMessage({url: image.src}, response => {
    console.log('prediction for image %s', image.src, response);
    console.log(image);
    if (response && response.result === true) {
      const replacedImageSrc = "https://source.unsplash.com/random/" + image.width + "x" + image.height;
      image.src = replacedImageSrc;
      image.srcset = "";
      image.dataset.cat = true;
      image.dataset.catReplaced = true;
    }
  });
}

document.addEventListener("scroll", (images)=>{ 
  clearTimeout(isScrolling);
  isScrolling = setTimeout(()=>{clasifyImages()}, 100);
});

Array.prototype.unique = function() {
  return this.filter(function (value, index, self) { 
    return self.indexOf(value) === index;
  });
}

clasifyImages();