import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'

import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { ImageFilter } from './Filter/ImageFilter'

const init = (): void => {
  const imageFilter = new ImageFilter()
  const domWatcher = new DOMWatcher(imageFilter)
  domWatcher.watch()

  createChromeStore({ createStore })(rootReducer)
    .then(store => {
      const { filterEffect, isFeatureActive } = store.getState().settings
      imageFilter.setSettings({ filterEffect, isFeatureActive })
      store.subscribe(() => {
        const { filterEffect, isFeatureActive } = store.getState().settings
        imageFilter.setSettings({ filterEffect, isFeatureActive })
      })
    })
    .catch(error => {
      console.warn(error)
      imageFilter.setSettings({ filterEffect: 'blur', isFeatureActive: true })
    })
}

// Ignore iframes, https://stackoverflow.com/a/326076/10432429
if (window.self === window.top) init()
