import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'
import { SettingsState } from '../popup/redux/reducers/settings'
import { isHostAllowed } from '../utils/allowlist'
import { CONTEXT_TARGET, UNHIDE_IMAGE, UnhideImageMessage } from '../utils/messages'

import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { ImageFilter } from './Filter/ImageFilter'

// chrome.storage reads are async, so there is a gap between document_start (when
// this script runs) and the store resolving and the observer attaching. Images
// parsed during that gap would flash before the filter can hide them. To prevent
// that, inject a stylesheet at document_start that hides every image the filter
// hasn't tagged yet. Once ImageFilter sets data-nsfw-filter-status, the per-image
// inline styles take over, so blur and grayscale modes are unaffected.
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

// Wire the right-click "unhide" menu. On every context-menu open we tell the
// service worker whether the cursor is over an image we filtered, so it can show
// the menu item only then; if the user picks it, the worker messages this frame
// to reveal the element we last reported.
const wireContextMenuUnhide = (imageFilter: ImageFilter): void => {
  let lastTarget: HTMLImageElement | null = null

  document.addEventListener('contextmenu', event => {
    const target = event.target
    const filtered = target instanceof HTMLImageElement && target.dataset.nsfwFilterStatus === 'nsfw'
    lastTarget = filtered ? target : null
    chrome.runtime.sendMessage({ type: CONTEXT_TARGET, filtered }).catch(() => undefined)
  }, true)

  chrome.runtime.onMessage.addListener((message: UnhideImageMessage) => {
    if (message?.type !== UNHIDE_IMAGE) return
    if (lastTarget !== null) {
      imageFilter.revealImage(lastTarget)
      lastTarget = null
    }
  })
}

const init = (): void => {
  const imageFilter = new ImageFilter()

  // The unhide menu must work per-frame: contextmenu events don't cross the
  // iframe boundary, and the background targets the UNHIDE reply to the exact
  // frame that reported the image. So wire reporting/unhide in every frame, but
  // keep the actual filtering (DOMWatcher, pending-hide, store) top-frame only.
  // Without this, the menu's global visibility goes stale over iframe images.
  wireContextMenuUnhide(imageFilter)

  // Ignore iframes for filtering, https://stackoverflow.com/a/326076/10432429
  if (window.self !== window.top) return

  const domWatcher = new DOMWatcher(imageFilter)

  injectPendingHide()
  const safety = setTimeout(removePendingHide, HIDE_STYLE_SAFETY_TIMEOUT)

  // Whether this page should be filtered right now, from a settings snapshot.
  const shouldFilter = (settings: SettingsState): boolean =>
    settings.enabled && !isHostAllowed(window.location.hostname, settings.websites)

  createChromeStore({ createStore })(rootReducer)
    .then(store => {
      clearTimeout(safety)

      let previous = store.getState().settings
      imageFilter.setSettings({ filterEffect: previous.filterEffect })

      let filtering = shouldFilter(previous)
      if (filtering) {
        // Keep the pending-hide stylesheet in place: from here per-image tagging
        // governs visibility (and it also hides dynamically-added images before
        // the observer's callback can run hideImage).
        domWatcher.watch()
      } else {
        // Extension turned off, or filtering disabled for this site: reveal everything.
        removePendingHide()
      }

      // reduxed keeps this store synced with chrome.storage, so a popup toggle or
      // an allowlist edit lands here without a reload. React live: start/stop
      // watching when on/off or the allowlist flips, and re-render already-blocked
      // images when the effect changes (a new effect isn't a new verdict).
      store.subscribe(() => {
        const next = store.getState().settings
        const prev = previous
        previous = next

        if (next.filterEffect !== prev.filterEffect) {
          imageFilter.setSettings({ filterEffect: next.filterEffect })
          if (filtering) imageFilter.applyEffectToBlocked()
        }

        const nextFiltering = shouldFilter(next)
        if (nextFiltering === filtering) return
        filtering = nextFiltering

        if (filtering) {
          domWatcher.watch()
        } else {
          domWatcher.unwatch()
          removePendingHide()
          imageFilter.revealAll()
        }
      })
    })
    .catch(error => {
      console.warn(error)
      imageFilter.setSettings({ filterEffect: 'blur' })
      clearTimeout(safety)
      removePendingHide()
    })
}

init()
