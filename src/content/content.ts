import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'
import { Logger } from '../utils/Logger'

import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { ImageFilter } from './Filter/ImageFilter'

const init = (): void => {
  const logger = new Logger()

  const imageFilter = new ImageFilter(logger)
  const domWatcher = new DOMWatcher(imageFilter)
  domWatcher.watch()

  createChromeStore({ createStore })(rootReducer)
    .then(store => {
      const { logging, filterEffect, filteringDiv } = store.getState().settings
      if (logging === true) logger.enable()

      imageFilter.setSettings({ filterEffect })
      domWatcher.setSettings({ filteringDiv })
    })
}

// Ignore iframes, https://stackoverflow.com/a/326076/10432429
try { if (window.self === window.top) init() } catch { };
