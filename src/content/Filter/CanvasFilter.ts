import { PredictionRequest } from '../../utils/messages'
import { mediaElements } from '../mediaRoots'

import { Filter } from './Filter'

export type ICanvasFilter = {
  observe: (canvas: HTMLCanvasElement, drawn?: boolean) => void
  revealCanvas: (canvas: HTMLCanvasElement) => void
  checkStyleMutation: (canvas: HTMLCanvasElement) => void
  applyEffectToBlocked: () => void
  revealAll: () => void
  start: () => void
  stop: () => void
}

type CanvasState = {
  epoch: number
  pixels: string
  pending: boolean
  overridden: boolean
}

const FRAME_SIZE = 224
const SAMPLE_INTERVAL = 1000

// Snapshots are keyed, not addressed, and the background deduplicates by key
// across every tab, so the key is scoped to this realm. randomUUID would do but
// it is secure-context only, and an ordinary http page has to work too.
const REALM = crypto.getRandomValues(new Uint32Array(2)).join('')
let snapshots = 0
const snapshotKey = (): string => `nsfw-filter-canvas:${REALM}-${++snapshots}`

// Drawing notifications catch changes before paint. Polling also covers drawings
// made outside the page's context, such as an OffscreenCanvas in a worker.
export class CanvasFilter extends Filter implements ICanvasFilter {
  private readonly states = new WeakMap<HTMLCanvasElement, CanvasState>()
  private readonly visible = new Set<HTMLCanvasElement>()
  private readonly viewport: IntersectionObserver
  private timer: ReturnType<typeof setInterval> | undefined
  private active = true
  private epoch = 0

  constructor () {
    super()
    this.viewport = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement
        if (entry.isIntersecting) this.visible.add(canvas)
        else this.visible.delete(canvas)
      }
      this.sampleVisible()
    })
  }

  public observe (canvas: HTMLCanvasElement, drawn = false): void {
    if (!this.active) return
    if (this.states.get(canvas)?.epoch !== this.epoch) {
      this.states.set(canvas, { epoch: this.epoch, pixels: '', pending: false, overridden: false })
      canvas.dataset.nsfwFilterStatus = 'processing'
      this.hideElement(canvas)
    }
    this.viewport.observe(canvas)
    if (drawn) this.sampleCanvas(canvas)
    if (this.timer === undefined) {
      this.timer = setInterval(() => this.sampleVisible(), SAMPLE_INTERVAL)
    }
  }

  public revealCanvas (canvas: HTMLCanvasElement): void {
    const state = this.states.get(canvas)
    if (state !== undefined) state.overridden = true
    this.revealElement(canvas)
    canvas.dataset.nsfwFilterStatus = 'sfw'
  }

  public applyEffectToBlocked (): void {
    for (const canvas of mediaElements<HTMLCanvasElement>('canvas[data-nsfw-filter-status]')) {
      this.checkStyleMutation(canvas)
    }
  }

  public start (): void {
    this.active = true
  }

  public stop (): void {
    this.active = false
    this.epoch++
    clearInterval(this.timer)
    this.timer = undefined
    this.viewport.disconnect()
    this.visible.clear()
  }

  public revealAll (): void {
    for (const canvas of mediaElements<HTMLCanvasElement>('canvas[data-nsfw-filter-status]')) {
      this.revealElement(canvas)
      this.states.delete(canvas)
      delete canvas.dataset.nsfwFilterStatus
    }
  }

  private sampleVisible (): void {
    if (!this.active || document.visibilityState !== 'visible') return
    for (const canvas of this.visible) {
      if (!canvas.isConnected) {
        this.visible.delete(canvas)
        this.viewport.unobserve(canvas)
        this.states.delete(canvas)
        continue
      }
      this.sampleCanvas(canvas)
    }
  }

  private sampleCanvas (canvas: HTMLCanvasElement): void {
    const state = this.states.get(canvas)
    if (state === undefined || state.pending || state.overridden) return
    if (this.isBlocked(canvas)) return
    void this.sample(canvas, state)
  }

  private async sample (canvas: HTMLCanvasElement, state: CanvasState): Promise<void> {
    const epoch = this.epoch
    state.pending = true
    try {
      if (this.belowMinSize(canvas.clientWidth, canvas.clientHeight)) {
        canvas.dataset.nsfwFilterStatus = 'sfw'
        this.revealElement(canvas)
        return
      }
      const copy = document.createElement('canvas')
      copy.width = copy.height = FRAME_SIZE
      const context = copy.getContext('2d')
      if (context === null) throw new Error('Canvas pixels unavailable')
      const readPixels = (): string => {
        context.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE)
        context.drawImage(canvas, 0, 0, FRAME_SIZE, FRAME_SIZE)
        return copy.toDataURL('image/png')
      }
      const pixels = readPixels()
      if (pixels === state.pixels) return
      state.pixels = pixels
      canvas.dataset.nsfwFilterStatus = 'processing'
      this.hideElement(canvas)
      // Nothing drawn yet, or cleared: there is nothing to show and nothing to
      // judge. Settling it keeps the canvas out of a pending state it can only
      // leave by being drawn again.
      if (!this.hasVisiblePixels(context)) {
        canvas.dataset.nsfwFilterStatus = 'sfw'
        this.revealElement(canvas)
        return
      }
      const { result, error } = await this.requestToAnalyzeImage(new PredictionRequest(snapshotKey(), pixels))
      if (epoch !== this.epoch || state.overridden) return
      if (error !== undefined) throw new Error(error)
      // Drawing can continue while the model works. A safe verdict must not
      // reveal different pixels; the next sample will inspect those instead.
      if (!result && readPixels() !== pixels) {
        state.pixels = ''
        return
      }
      canvas.dataset.nsfwFilterStatus = result ? 'nsfw' : 'sfw'
      if (result) {
        this.blockedItems++
        this.applyEffect(canvas)
      } else {
        this.revealElement(canvas)
      }
    } catch {
      if (epoch !== this.epoch || state.overridden) return
      canvas.dataset.nsfwFilterStatus = 'unavailable'
      this.applyEffect(canvas)
    } finally {
      state.pending = false
    }
  }

  private hasVisiblePixels (context: CanvasRenderingContext2D): boolean {
    const rgba = context.getImageData(0, 0, FRAME_SIZE, FRAME_SIZE).data
    for (let alpha = 3; alpha < rgba.length; alpha += 4) {
      if (rgba[alpha] !== 0) return true
    }
    return false
  }
}
