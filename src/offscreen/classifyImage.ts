// Decode animations in the extension document, where host permissions allow the
// image download. File signatures matter: a GIF need not have a .gif URL or MIME.
const MAX_ANIMATION_FRAMES = 300
// Sample at most eight frames, including the endpoints, to limit inference work.
const MAX_PREDICTIONS = 8
const IMAGE_SIZE = 224
// Match the upstream image loader: loads run in parallel, outside inference.
const LOAD_TIMEOUT = 10000
// Bound encoded bytes before buffering or decoding. Larger sources still use
// the browser's ordinary image loader, without extended animation inspection.
const MAX_ENCODED_BYTES = 20 * 1024 * 1024

type Predict = (image: HTMLImageElement, label: string) => Promise<boolean>

const loadImage = async (url: string, label: string): Promise<HTMLImageElement> => {
  const image: HTMLImageElement = new Image(IMAGE_SIZE, IMAGE_SIZE)

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Image load timeout ${label}`)), LOAD_TIMEOUT)
    image.crossOrigin = 'anonymous'
    image.onload = () => { clearTimeout(timer); resolve(image) }
    image.onerror = (err) => { clearTimeout(timer); reject(err) }
    image.src = url
  })
}

const loadBlob = async (url: string): Promise<Blob | null> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(LOAD_TIMEOUT) })
  if (!response.ok) throw new Error(`Image request failed (${response.status})`)
  if (response.body === null) return null

  const reader = response.body.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let bytes = 0
  try {
    if (Number(response.headers.get('Content-Length')) > MAX_ENCODED_BYTES) return null
    while (true) {
      const { done, value } = await reader.read()
      if (done) return new Blob(chunks, { type: response.headers.get('Content-Type') ?? '' })
      bytes += value.byteLength
      if (bytes > MAX_ENCODED_BYTES) return null
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

const animationType = async (blob: Blob): Promise<string | null> => {
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  const signature = String.fromCharCode(...bytes)
  if (signature.startsWith('GIF87a') || signature.startsWith('GIF89a')) return 'image/gif'
  if (signature.startsWith('\u0089PNG\r\n\u001a\n')) return 'image/png'
  if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP') return 'image/webp'
  return null
}

// Sample evenly spaced frames, checking the latter half first for content after
// a safe intro. The decoder may still need earlier frames to reconstruct them.
const sampleOrder = (frameCount: number): number[] => {
  const count = Math.min(frameCount, MAX_PREDICTIONS)
  const step = count === 1 ? 0 : (frameCount - 1) / (count - 1)
  const indices = Array.from({ length: count }, (_, position) => Math.round(position * step))
  const middle = Math.floor(count / 2)
  return [...indices.slice(middle), ...indices.slice(0, middle)]
}

export const classifyImage = async (url: string, label: string, predict: Predict): Promise<boolean> => {
  // Decode and sample locally through the shared prediction callback. If the
  // source exceeds the byte budget, the ordinary loader requests it again.
  const blob = await loadBlob(url)
  if (blob === null) return await predict(await loadImage(url, label), label)
  const type = await animationType(blob)
  const objectUrl = URL.createObjectURL(blob)
  let decoder: ImageDecoder | undefined

  try {
    if (type === null || typeof ImageDecoder === 'undefined' || !await ImageDecoder.isTypeSupported(type)) {
      return await predict(await loadImage(objectUrl, label), label)
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
    // The animation budget must not remove the ordinary image check. Oversized
    // animations still get the same baseline inspection as upstream.
    if (track === null || track.frameCount <= 1 || track.frameCount > MAX_ANIMATION_FRAMES) {
      return await predict(await loadImage(objectUrl, label), label)
    }

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
      if (await predict(await loadImage(pixels, label), `${label} frame ${index}`)) return true
    }
    return false
  } finally {
    decoder?.close()
    URL.revokeObjectURL(objectUrl)
  }
}
