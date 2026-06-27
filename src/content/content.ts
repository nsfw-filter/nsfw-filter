import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'

import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { ImageFilter } from './Filter/ImageFilter'

// Reading the settings from chrome.storage is asynchronous, so there is a short
// window between document_start (when this content script runs) and when the
// store resolves and the observer attaches. Without a guard, images parsed and
// painted during that window flash on screen before the filter can hide them.
// Inject a stylesheet *synchronously* at document_start that hides every image
// the filter hasn't tagged yet, so nothing paints before it is classified. As
// soon as ImageFilter sets data-nsfw-filter-status (processing/sfw/nsfw) the
// per-image inline styles take over, so blur/grayscale modes are unaffected.
const HIDE_STYLE_ID = 'nsfw-filter-pending-hide'
// Backstop: if the store somehow never settles, reveal images rather than
// leaving the page permanently blank (matches the "show images if we can't
// filter" degradation of the .catch branch below).
const HIDE_STYLE_SAFETY_TIMEOUT = 4000

const injectPendingHide = (): void => {
  const style = document.createElement('style')
  style.id = HIDE_STYLE_ID
  style.textContent = 'img:not([data-nsfw-filter-status]){visibility:hidden !important}'
  document.documentElement.appendChild(style)
}

const removePendingHide = (): void => {
  document.getElementById(HIDE_STYLE_ID)?.remove()
}

const init = (): void => {
  const imageFilter = new ImageFilter()
  const domWatcher = new DOMWatcher(imageFilter)

  injectPendingHide()
  const safety = setTimeout(removePendingHide, HIDE_STYLE_SAFETY_TIMEOUT)

  createChromeStore({ createStore })(rootReducer)
    .then(store => {
      const { filterEffect, websites } = store.getState().settings
      imageFilter.setSettings({ filterEffect })
      if (websites.includes(window.location.hostname) === false) {
        // Keep the pending-hide stylesheet in place: from here per-image tagging
        // governs visibility (and it also hides dynamically-added images before
        // the observer's callback can run hideImage).
        clearTimeout(safety)
        domWatcher.watch()
      } else {
        // Filtering disabled for this site: reveal everything.
        clearTimeout(safety)
        removePendingHide()
      }
    })
    .catch(error => {
      console.warn(error)
      imageFilter.setSettings({ filterEffect: 'blur' })
      clearTimeout(safety)
      removePendingHide()
    })
}

// Ignore iframes, https://stackoverflow.com/a/326076/10432429
if (window.self === window.top) init()
