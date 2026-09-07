import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'
import { SettingsState } from '../popup/redux/reducers/settings'
import { isHostAllowed } from '../utils/allowlist'
import { CONTEXT_TARGET, PAGE_HOST, UNHIDE_IMAGE, UnhideImageMessage } from '../utils/messages'

import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { HIDE_STYLE_ID, injectPendingHide } from './DOMWatcher/pendingStyle'
import { BackgroundImageFilter } from './Filter/BackgroundImageFilter'
import { CanvasFilter } from './Filter/CanvasFilter'
import { ImageElement, ImageFilter } from './Filter/ImageFilter'
import { VideoFilter } from './Filter/VideoFilter'
import { mediaElements } from './mediaRoots'

// chrome.storage reads are async, so there is a gap between document_start (when
// this script runs) and the store resolving and the observer attaching. Images
// parsed during that gap would flash before the filter can hide them. To prevent
// that, inject a stylesheet at document_start that hides every image the filter
// hasn't tagged yet. Once ImageFilter sets data-nsfw-filter-status, the per-image
// inline styles take over, so blur and grayscale modes are unaffected.
// Backstop: if the store somehow never settles, reveal images rather than
// leaving the page permanently blank (matches the "show images if we can't
// filter" degradation of the .catch branch below).
const HIDE_STYLE_SAFETY_TIMEOUT = 4000

const removePendingHide = (): void => {
  mediaElements(`#${HIDE_STYLE_ID}`).forEach(style => style.remove())
}

// Wire the right-click "unhide" menu. On every context-menu open we tell the
// service worker whether the cursor is over an image we filtered, so it can show
// the menu item only then; if the user picks it, the worker messages this frame
// to reveal the element we last reported.
const wireContextMenuUnhide = (
  imageFilter: ImageFilter,
  videoFilter: VideoFilter,
  canvasFilter: CanvasFilter
): void => {
  let lastTarget: ImageElement | HTMLVideoElement | HTMLCanvasElement | null = null

  document.addEventListener('contextmenu', event => {
    const found = event.composedPath().find(node =>
      node instanceof Element && node.matches('img,video,canvas,svg image')
    )
    const target = (found ?? null) as ImageElement | HTMLVideoElement | HTMLCanvasElement | null
    const status = target?.dataset.nsfwFilterStatus
    const filtered = status === 'nsfw' || status === 'unavailable'
    lastTarget = filtered ? target : null
    chrome.runtime.sendMessage({ type: CONTEXT_TARGET, filtered }).catch(() => undefined)
  }, true)

  chrome.runtime.onMessage.addListener((message: UnhideImageMessage) => {
    if (message?.type !== UNHIDE_IMAGE) return
    if (lastTarget === null) return

    if (lastTarget instanceof HTMLVideoElement) {
      videoFilter.revealVideo(lastTarget)
    } else if (lastTarget instanceof HTMLCanvasElement) {
      canvasFilter.revealCanvas(lastTarget)
    } else {
      imageFilter.revealImage(lastTarget)
    }
    lastTarget = null
  })
}

const init = (): void => {
  const imageFilter = new ImageFilter()
  const videoFilter = new VideoFilter()
  const canvasFilter = new CanvasFilter()
  const backgroundFilter = new BackgroundImageFilter()
  const domWatcher = new DOMWatcher(imageFilter, videoFilter, backgroundFilter, canvasFilter)

  wireContextMenuUnhide(imageFilter, videoFilter, canvasFilter)

  // The three element filters share a lifecycle. Naming the set once keeps a new
  // filter from being added to some of these steps and missed in the others.
  const mediaFilters = [imageFilter, videoFilter, canvasFilter]
  const setEffect = (filterEffect: SettingsState['filterEffect']): void => {
    for (const filter of mediaFilters) filter.setSettings({ filterEffect })
  }

  injectPendingHide(document)
  const safety = setTimeout(removePendingHide, HIDE_STYLE_SAFETY_TIMEOUT)

  // Whether this page should be filtered right now, from a settings snapshot.
  let pageHost = window.location.hostname
  const shouldFilter = (settings: SettingsState): boolean =>
    settings.enabled && !isHostAllowed(pageHost, settings.websites)

  // sendMessage throws synchronously once the extension context is gone, which a
  // .catch() on the returned promise never sees.
  const askPageHost = async (): Promise<unknown> => {
    try {
      return await chrome.runtime.sendMessage({ type: PAGE_HOST })
    } catch {
      return pageHost
    }
  }

  Promise.all([createChromeStore({ createStore })(rootReducer), askPageHost()])
    .then(([store, host]) => {
      if (typeof host === 'string') pageHost = host
      clearTimeout(safety)

      let previous = store.getState().settings
      setEffect(previous.filterEffect)

      let filtering = shouldFilter(previous)
      if (filtering) {
        // Keep the pending-hide stylesheet in place: from here per-image tagging
        // governs visibility (and it also hides dynamically-added images before
        // the observer's callback can run hideImage).
        domWatcher.watch()
      } else {
        // Extension turned off, or filtering disabled for this site: reveal everything.
        backgroundFilter.stop()
        for (const filter of mediaFilters) filter.stop()
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
          setEffect(next.filterEffect)
          // A new effect is not a new verdict: re-render what is already blocked.
          if (filtering) {
            for (const filter of mediaFilters) filter.applyEffectToBlocked()
          }
        }

        const nextFiltering = shouldFilter(next)
        if (nextFiltering === filtering) return
        filtering = nextFiltering

        if (filtering) {
          for (const filter of mediaFilters) filter.start()
          backgroundFilter.start()
          domWatcher.watch()
        } else {
          domWatcher.unwatch()
          // Stop before revealing: stop() is what keeps a verdict still in flight
          // from applying, so revealing first can be undone by a late reply.
          for (const filter of mediaFilters) filter.stop()
          backgroundFilter.stop()
          removePendingHide()
          for (const filter of mediaFilters) filter.revealAll()
          backgroundFilter.revealAll()
        }
      })
    })
    .catch(error => {
      console.warn(error)
      setEffect('blur')
      backgroundFilter.stop()
      clearTimeout(safety)
      removePendingHide()
    })
}

init()
