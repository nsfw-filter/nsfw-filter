import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'

import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { ImageFilter } from './Filter/ImageFilter'

const init = (): void => {
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
}

// Ignore iframes, https://stackoverflow.com/a/326076/10432429
if (window.self === window.top) init()
