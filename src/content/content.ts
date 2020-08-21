import { _HTMLImageElement as _Image, _HTMLVideoElement as Video } from '../utils/types'
import { VideoFilter } from './Filter/VideoFilter'
import { ImageFilter } from './Filter/ImageFilter'
import { Store } from '../utils/Store'
import { Memory } from '../utils/Memory'

new Memory().start()

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
  store.getCounters().then((result = { images: 0, videos: 0 }) => {
    const updatedData = {
      images: result.images + imageFilter.getBlockAmount(),
      videos: result.videos + videoFilter.getBlockAmount()
    }

    store.saveCounters(updatedData).then(() => {}, () => {})
  }, () => {})
})
