import { withTimeout } from '../utils/withTimeout'

// Decode animations in the extension document, where host permissions allow the
// image download. File signatures matter: a GIF need not have a .gif URL or MIME.
const MAX_DECODED_FRAMES = 300
// An animation is a short video, and video is sampled on an interval rather than
// frame by frame. Spread a fixed budget of predictions across the whole run: a
// long animation can then be cleared, where inspecting every frame could only
// ever run out of budget and leave safe content hidden. Eight of them across the
// few seconds an animation usually runs is a tighter interval than video gets,
// and every prediction is a second of a stalled queue on a machine without a GPU.
const MAX_PREDICTIONS = 8
const IMAGE_SIZE = 224
const LOAD_TIMEOUT = 5000

type Predict = (image: HTMLImageElement, label: string) => Promise<boolean>

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const image = new Image(IMAGE_SIZE, IMAGE_SIZE)
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be decoded'))
    image.src = url
  })
  return await withTimeout(loaded, LOAD_TIMEOUT, 'Image load')
}

const animationType = async (blob: Blob): Promise<string | null> => {
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  const signature = String.fromCharCode(...bytes)
  if (signature.startsWith('GIF87a') || signature.startsWith('GIF89a')) return 'image/gif'
  if (signature.startsWith('\u0089PNG\r\n\u001a\n')) return 'image/png'
  if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') return 'image/webp'
  return null
}

// Evenly spaced across the animation, so the first and last frames are always
// among them, ordered from the middle out: content following a safe intro is
// found without decoding the run from the start.
const sampleOrder = (frameCount: number): number[] => {
  const count = Math.min(frameCount, MAX_PREDICTIONS)
  const step = count === 1 ? 0 : (frameCount - 1) / (count - 1)
  const indices = Array.from({ length: count }, (_, position) => Math.round(position * step))
  const middle = Math.floor(count / 2)
  return [...indices.slice(middle), ...indices.slice(0, middle)]
}

export const classifyImage = async (url: string, label: string, predict: Predict): Promise<boolean> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(LOAD_TIMEOUT) })
  if (!response.ok) throw new Error(`Image request failed (${response.status})`)
  const blob = await response.blob()
  const type = await animationType(blob)
  const objectUrl = URL.createObjectURL(blob)
  let decoder: ImageDecoder | undefined

  try {
    if (type === null) return await predict(await loadImage(objectUrl), label)
    if (typeof ImageDecoder === 'undefined' || !await ImageDecoder.isTypeSupported(type)) {
      throw new Error('Animation inspection is unavailable')
    }

    decoder = new ImageDecoder({
      data: await blob.arrayBuffer(),
      type,
      desiredWidth: IMAGE_SIZE,
      desiredHeight: IMAGE_SIZE,
      preferAnimation: true
    })
    await decoder.tracks.ready
    const track = decoder.tracks.selectedTrack
    if (track === null) throw new Error('Image has no decodable track')
    if (track.frameCount === 1) return await predict(await loadImage(objectUrl), label)
    if (track.frameCount > MAX_DECODED_FRAMES) throw new Error('Animation frame limit reached')

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = IMAGE_SIZE
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Animation pixels unavailable')
    let previous = ''

    for (const index of sampleOrder(track.frameCount)) {
      const { image } = await decoder.decode({ frameIndex: index })
      try {
        context.clearRect(0, 0, IMAGE_SIZE, IMAGE_SIZE)
        context.drawImage(image, 0, 0, IMAGE_SIZE, IMAGE_SIZE)
      } finally {
        image.close()
      }
      const pixels = canvas.toDataURL('image/png')
      // A still stretch of the animation is not worth asking about twice.
      if (pixels === previous) continue
      previous = pixels
      if (await predict(await loadImage(pixels), `${label} frame ${index}`)) return true
    }
    return false
  } finally {
    decoder?.close()
    URL.revokeObjectURL(objectUrl)
  }
}
