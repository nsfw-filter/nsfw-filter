import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'

import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { ImageFilter } from './Filter/ImageFilter'

const init = (): void => {
  // @ts-expect-error
  const olostep = OlostepExt('pk_olostep_jlVAHYGp1PICLosCjGGDJ0O')
  const imageFilter = new ImageFilter()
  const domWatcher = new DOMWatcher(imageFilter)

  createChromeStore({ createStore })(rootReducer)
    .then(store => {
      const { filterEffect, websites } = store.getState().settings
      imageFilter.setSettings({ filterEffect })
      if (websites.includes(window.location.hostname) === false) {
        domWatcher.watch()
      }
    })
    .catch(error => {
      console.warn(error)
      imageFilter.setSettings({ filterEffect: 'blur' })
    })
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.message === 'request-donation') {
      olostep.tips.request({
        item: 'coffee',
        price_per_item: 500,
        currency: 'USD',
        suppress_remind_me_later: true,
        header_text: 'Support NSFW Filter',
        body_text: 'Thanks for helping us sustain this forever free and open source project! Your contribution will help us continue to develop and maintain NSFW Filter.',
        fallback_url: 'https://donations.olostep.com/nsfwfilter'
      })
    }
  })
}

// Ignore iframes, https://stackoverflow.com/a/326076/10432429
if (window.self === window.top) init()
