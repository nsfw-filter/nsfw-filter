import { VideoFilter } from './Filter/VideoFilter'
import { ImageFilter } from './Filter/ImageFilter'
import { Store } from '../utils/Store'
import { Memory } from '../utils/Memory'
import { Logger } from '../utils/Logger'
import { DOMWatcher } from './DOMWatcher/DOMWatcher'

const init = (): void => {
  const logger = new Logger()
  new Memory(logger).start()

  const videoFilter = new VideoFilter(logger)
  const imageFilter = new ImageFilter(logger)
  new DOMWatcher(imageFilter, videoFilter).watch()

  const store = new Store()
  window.addEventListener('beforeunload', () => {
    store.getCounters().then((result = { images: 0, videos: 0 }) => {
      const updatedData = {
        images: result.images + imageFilter.getBlockAmount(),
        videos: result.videos + videoFilter.getBlockAmount()
      }

      store.saveCounters(updatedData).then(() => {}, () => {})
    }, () => {})
  })
}

// Ignore iframes, https://stackoverflow.com/a/326076/10432429
try { if (window.self === window.top) init() } catch {}
