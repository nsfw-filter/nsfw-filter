import { VideoFilter } from './Filter/VideoFilter'
import { ImageFilter } from './Filter/ImageFilter'
import { Memory } from '../utils/Memory'
import { Logger } from '../utils/Logger'
import { DOMWatcher } from './DOMWatcher/DOMWatcher'

const init = (): void => {
  const logger = new Logger()
  new Memory(logger).start()

  const videoFilter = new VideoFilter(logger)
  const imageFilter = new ImageFilter(logger)
  new DOMWatcher(imageFilter, videoFilter).watch()
}

// Ignore iframes, https://stackoverflow.com/a/326076/10432429
try { if (window.self === window.top) init() } catch { }
