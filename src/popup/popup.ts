import { Store } from '../utils/Store'

const store = new Store()

store.getCounters().then(_result => {
  const resultImages = typeof _result.images === 'number' ? _result.images : 0
  const resultVideos = typeof _result.videos === 'number' ? _result.videos : 0

  const image = document.getElementById('stats_image_amount')
  if (image != null) image.innerHTML = `${resultImages}`

  const video = document.getElementById('stats_video_amount')
  if (video != null) video.innerHTML = `${resultVideos}`

  const total = document.getElementById('stats_total_amount')
  if (total != null) total.innerHTML = `${Math.round(resultImages + resultVideos)}`
}, () => {})
