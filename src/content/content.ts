import { _HTMLImageElement as _Image, _HTMLVideoElement as Video } from '../utils/types'
import { VideoFilter } from './Filter/VideoFilter'
import { ImageFilter } from './Filter/ImageFilter'
import { Store } from '../utils/Store'
import { DEBUG, getMemory } from '../utils/common'

if (DEBUG) getMemory()

const videoFilter = new VideoFilter()
const imageFilter = new ImageFilter()
const store = new Store()

const callback = (mutationsList: MutationRecord[]): void => {
  for (const mutation of mutationsList) {
    if ((mutation.target as _Image).tagName === 'IMG') {
      imageFilter.analyzeImage(mutation.target as _Image)
    }

    const images = (mutation.target as Element).getElementsByTagName('img') as HTMLCollectionOf<_Image>
    for (let i = 0; i < images.length; i++) {
      imageFilter.analyzeImage(images[i])
    }

    if ((mutation.target as Video).tagName === 'VIDEO') {
      videoFilter.analyzeVideo(mutation.target as Video)
    }

    const videos = (mutation.target as Element).getElementsByTagName('video') as HTMLCollectionOf<Video>
    for (let i = 0; i < videos.length; i++) {
      videoFilter.analyzeVideo(videos[i])
    }
  }
}

const observer = new MutationObserver(callback)
observer.observe(document, { subtree: true, attributes: true, childList: true })

window.addEventListener('beforeunload', () => {
  store.getCounters().then(_result => {
    const resultImages = typeof _result.images === 'number' ? _result.images : 0
    const resultVideos = typeof _result.videos === 'number' ? _result.videos : 0

    const updatedData = {
      images: resultImages + imageFilter.getBlockAmount(),
      videos: resultVideos + videoFilter.getBlockAmount()
    }

    store.saveCounters(updatedData).then(() => {}, () => {})
  }, () => {})
})
