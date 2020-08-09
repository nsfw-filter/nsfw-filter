import { isValidHttpUrl, notEmpty } from './utils'

type _HTMLImageElement = HTMLImageElement & {
  _isChecked: boolean
  _fullRawImageTimer?: number
  _fullRawImageCounter?: number
  _reconectTimer?: number
  _reconectCount?: number
}

const clasifyImage = (image: _HTMLImageElement): void => {
  if (!image._isChecked && image.src.length > 0) {
    image.style.visibility = 'hidden'
    analyzeImage(image)
    image._isChecked = true
  }
}

export type messageType = {
  srcUrl: string
  lazyUrls?: string[]
}

export type responseType = {
  result: boolean
  url: string
  err?: string
}

// Calls the background script passing it the image URL
const analyzeImage = (image: _HTMLImageElement): void => {
  console.log(`Analyze image ${image.src}`)

  // For google images case where raw image has invalid url with slashes
  if (Array.isArray(image.src.match(/\/\/\/\/\//))) {
    image._fullRawImageCounter = image._fullRawImageCounter ?? 0
    image._fullRawImageCounter++

    if (image._fullRawImageCounter > 10) {
      image.style.visibility = 'visible'
      console.log(`Invalid image marked as visible ${image.src}`)
    } else {
      clearTimeout(image._fullRawImageTimer)
      image._fullRawImageTimer = window.setTimeout(() => analyzeImage(image), 100)
    }
  } else {
    const message: messageType = { srcUrl: image.src }

    if (Object.values(image.dataset).length > 0) {
      message.lazyUrls = Object.values(image.dataset).map(url => {
        if (typeof url === 'string' && url.length > 5) {
          return isValidHttpUrl(url) ? url : `${window.location.origin}${url}`
        }
      }).filter(notEmpty)
    }

    chrome.runtime.sendMessage(message, (response: responseType) => {
    // In case of background worker not alive yet
      if (notEmpty(chrome.runtime.lastError)) {
        image._reconectCount = image._reconectCount ?? 0
        console.log(`Cannot connect to background worker for ${image.src} image, attempt ${image._reconectCount}, error: ${chrome.runtime.lastError.message}`)

        image._reconectCount++
        clearTimeout(image._reconectTimer)
        image._reconectTimer = window.setTimeout(() => analyzeImage(image), 100)
      } else {
        console.log(`Prediction result is ${response.result} for image ${response.url}, error: ${response.err}`)

        if (!response.result) {
          image.style.visibility = 'visible'
        }
      }
    })
  }
}

const callback = (mutationsList: MutationRecord[]): void => {
  for (const mutation of mutationsList) {
    if ((mutation.target as _HTMLImageElement).tagName === 'IMG') {
      clasifyImage(mutation.target as _HTMLImageElement)
    }

    const images = (mutation.target as Element).getElementsByTagName('img') as HTMLCollectionOf<_HTMLImageElement>
    for (let i = 0; i < images.length; i++) {
      clasifyImage(images[i])
    }
  }
}

const observer = new MutationObserver(callback)

if (document.readyState === 'loading') {
  observer.observe(document, { subtree: true, attributes: true, childList: true })
}
