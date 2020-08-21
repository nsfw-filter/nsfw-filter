import { Store } from '../utils/Store'

const store = new Store()

store.getCounters().then((result = { images: 0, videos: 0 }) => {
  const image = document.getElementById('stats_image_amount')
  if (image != null) image.innerHTML = `${result.images}`

  const video = document.getElementById('stats_video_amount')
  if (video != null) video.innerHTML = `${result.videos}`

  const total = document.getElementById('stats_total_amount')
  if (total != null) total.innerHTML = `${Math.round(result.images + result.videos)}`
}, () => {})
