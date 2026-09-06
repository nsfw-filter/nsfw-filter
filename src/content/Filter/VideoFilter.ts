import { PredictionRequest } from '../../utils/messages'

import { Filter } from './Filter'

export type IVideoFilter = {
  analyzeVideo: (video: HTMLVideoElement, sourceChanged: boolean) => void
  checkPoster: (video: HTMLVideoElement) => void
  revealVideo: (video: HTMLVideoElement) => void
  checkStyleMutation: (video: HTMLVideoElement) => void
  applyEffectToBlocked: () => void
  revealAll: () => void
  start: () => void
  stop: () => void
}

type VideoState = {
  // Bumped whenever the element starts playing different media. A reply carrying
  // an older generation is for footage this element is no longer showing.
  generation: number
  // Poster requests carry their own counter: a poster swap replaces the preview
  // without replacing the footage, so it must not invalidate frame work.
  posterGeneration: number
  approved: number
  lastSampleTime: number
  unsampleable: boolean
  // A verdict is out for footage that has decoded, so the element is hidden for
  // the frame, not for the poster: nothing about the poster may reveal it.
  framePending: boolean
  // The user unhid this element. Verdicts still in flight no longer apply.
  overridden: boolean
  observed: boolean
  wired: boolean
}

const FRAME_SIZE = 224
const FRAME_QUALITY = 0.8
const MIN_VIDEO_SIZE = 41
// Sampling follows media time, not wall time: a paused or buffering video is not
// showing anything new, and a 2x playback is showing it twice as fast.
const SAMPLE_INTERVAL = 10
// A video can be laid out long before it has a frame to give (preload="none",
// a slow network). Reveal it rather than hold a hidden element on a frame that
// may never decode.
const FRAME_DEADLINE = 3000
const OFFSCREEN_MARGIN = '300px'

// Frames are keyed, not addressed, and the background deduplicates by key across
// every tab. A counter alone would hand tab B the verdict for tab A's frame, so
// the key is scoped to this realm.
const REALM = crypto.getRandomValues(new Uint32Array(2)).join('')
let frameRequests = 0
const frameKey = (): string => `nsfw-filter-frame:${REALM}-${++frameRequests}`

export class VideoFilter extends Filter implements IVideoFilter {
  private readonly states: WeakMap<HTMLVideoElement, VideoState>
  private readonly due: Set<HTMLVideoElement>
  private readonly visible: Set<HTMLVideoElement>
  private readonly viewport: IntersectionObserver
  private sampling: boolean
  private active: boolean

  constructor () {
    super()
    this.states = new WeakMap()
    this.due = new Set()
    this.visible = new Set()
    this.sampling = false
    this.active = true
    this.viewport = new IntersectionObserver(
      entries => this.onIntersection(entries),
      { rootMargin: OFFSCREEN_MARGIN }
    )
    // A background tab is not sampled, and a paused video in one produces no
    // media events on the way back. Nothing else would ask again.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      for (const video of this.visible) this.schedule(video)
    })
  }

  public analyzeVideo (video: HTMLVideoElement, sourceChanged: boolean = false): void {
    if (!this.active) {
      // Filtering was turned off while this video was out of the document, so
      // revealAll() never reached it. It comes back filtered otherwise.
      if (video.dataset.nsfwFilterStatus !== undefined) this.retire(video)
      return
    }

    const state = this.stateOf(video)
    if (sourceChanged) this.reset(video, state)
    if (!state.wired) this.wire(video, state)
    // A video the page took out and put back is no longer observed: unobserving
    // ends observation for good, while the listeners survive the round trip.
    if (!state.observed) {
      state.observed = true
      this.viewport.observe(video)
    }

    if (video.dataset.nsfwFilterStatus === undefined) {
      // Small videos are no more filtered than small images, but they still need
      // a status so the pending-hide stylesheet stops hiding them.
      if (this.tooSmall(video)) {
        video.dataset.nsfwFilterStatus = 'sfw'
        return
      }

      if (video.poster.length > 0) {
        video.dataset.nsfwFilterStatus = 'processing'
        this.hideElement(video)
        this.classifyPoster(video, state)
      } else {
        // Nothing on screen to judge yet. The frame that appears is judged below,
        // and until then the element has to carry a status or the pending-hide
        // stylesheet keeps hiding it.
        video.dataset.nsfwFilterStatus = 'sfw'
      }
    }

    // A paused video still shows its first decoded frame, so having one is reason
    // enough to sample.
    if (!video.paused || video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) this.schedule(video)
  }

  // A poster swap replaces the preview, not the footage: a frame verdict already
  // reached for this media outranks whatever the new poster says.
  public checkPoster (video: HTMLVideoElement): void {
    if (!this.active) return

    const state = this.stateOf(video)
    if (video.poster.length === 0) {
      // The preview is gone, and with it the reason this element is hidden. The
      // reply for it is dropped, so nothing else would settle the hide.
      state.posterGeneration++
      if (video.dataset.nsfwFilterStatus === 'processing' && !state.framePending) {
        this.reveal(video)
        this.schedule(video)
      }
      return
    }
    if (video.dataset.nsfwFilterStatus === 'nsfw') return
    // Until the video has played, the poster is what is on screen, however many
    // frames have been decoded and judged behind it.
    if (state.approved === state.generation && video.played.length > 0) return

    state.posterGeneration++
    video.dataset.nsfwFilterStatus = 'processing'
    this.hideElement(video)
    this.classifyPoster(video, state)
  }

  // User-initiated unhide from the right-click menu. Sampling stops until the
  // element plays different media: re-blocking what the user just revealed would
  // make the menu item useless.
  public revealVideo (video: HTMLVideoElement): void {
    const state = this.stateOf(video)
    state.approved = state.generation
    state.unsampleable = true
    state.overridden = true
    this.due.delete(video)

    this.revealElement(video)
    video.dataset.nsfwFilterStatus = 'sfw'
  }

  public checkStyleMutation (video: HTMLVideoElement): void {
    const status = video.dataset.nsfwFilterStatus
    if (status === 'processing') {
      if (video.style.visibility !== 'hidden') this.hideElement(video)
      return
    }
    if (status !== 'nsfw') return
    if (this.isEffectApplied(video)) return
    this.applyEffect(video)
  }

  public applyEffectToBlocked (): void {
    const blocked = document.querySelectorAll<HTMLVideoElement>('video[data-nsfw-filter-status="nsfw"]')
    blocked.forEach(video => this.applyEffect(video))
  }

  public revealAll (): void {
    const filtered = document.querySelectorAll<HTMLVideoElement>('video[data-nsfw-filter-status]')
    filtered.forEach(video => this.retire(video))
  }

  // A verdict reached while filtering was on does not survive being turned off
  // and on again, the same way images are reclassified rather than trusted. The
  // user's unhide goes with it, or the next verdict is dropped and the video
  // stays hidden.
  private retire (video: HTMLVideoElement): void {
    this.revealElement(video)
    delete video.dataset.nsfwFilterStatus
    this.due.delete(video)

    const state = this.stateOf(video)
    state.generation++
    state.unsampleable = false
    state.framePending = false
    state.overridden = false
  }

  // Filtering was turned off for this page. The elements stay wired, so turning
  // it back on picks up the videos already on the page.
  public stop (): void {
    this.active = false
    this.due.clear()
  }

  public start (): void {
    this.active = true
  }

  private stateOf (video: HTMLVideoElement): VideoState {
    const existing = this.states.get(video)
    if (existing !== undefined) return existing

    const state: VideoState = {
      generation: 0,
      posterGeneration: 0,
      approved: -1,
      lastSampleTime: Number.NEGATIVE_INFINITY,
      unsampleable: false,
      framePending: false,
      overridden: false,
      observed: false,
      wired: false
    }
    this.states.set(video, state)

    return state
  }

  private reset (video: HTMLVideoElement, state: VideoState): void {
    state.generation++
    state.posterGeneration++
    state.approved = -1
    state.lastSampleTime = Number.NEGATIVE_INFINITY
    state.unsampleable = false
    state.framePending = false
    state.overridden = false
    this.due.delete(video)
    delete video.dataset.nsfwFilterStatus
    // Nothing is being shown yet, and the effect belonged to the old media. The
    // next sample hides it again if there is anything to judge.
    this.revealElement(video)
  }

  private wire (video: HTMLVideoElement, state: VideoState): void {
    state.wired = true

    // Different media in the same element: everything decided about the old
    // source, including a user unhide, stops applying. The element is then judged
    // from scratch, which also gives it back the status the pending-hide
    // stylesheet needs to stop hiding it.
    const restart = (): void => {
      this.reset(video, state)
      this.analyzeVideo(video, false)
    }
    video.addEventListener('loadstart', restart)
    video.addEventListener('emptied', restart)

    video.addEventListener('play', () => {
      // A page that calls play() on a blocked video gets it back paused rather
      // than playing behind the effect.
      if (video.dataset.nsfwFilterStatus === 'nsfw') {
        video.pause()
        return
      }
      this.schedule(video)
    })
    // The first decoded frame is on screen whether or not anything is playing.
    video.addEventListener('loadeddata', () => this.schedule(video))
    // Seeking exposes a frame nothing has judged, including while paused.
    video.addEventListener('seeked', () => this.schedule(video))
    video.addEventListener('timeupdate', () => this.schedule(video))
  }

  private onIntersection (entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting) {
        this.visible.add(video)
        this.schedule(video)
        continue
      }

      this.visible.delete(video)
      // Removal from the document reads as leaving the viewport, which is the
      // one signal that a feed dropping videos gives us.
      if (!video.isConnected) {
        this.stateOf(video).observed = false
        this.viewport.unobserve(video)
        this.due.delete(video)
      }
    }
  }

  private tooSmall (video: HTMLVideoElement): boolean {
    const width = video.clientWidth
    const height = video.clientHeight

    return width !== 0 && height !== 0 && (width <= MIN_VIDEO_SIZE || height <= MIN_VIDEO_SIZE)
  }

  private schedule (video: HTMLVideoElement): void {
    const state = this.stateOf(video)
    if (!this.eligible(video, state)) return

    this.due.add(video)
    void this.drain()
  }

  private eligible (video: HTMLVideoElement, state: VideoState): boolean {
    if (!this.active || state.unsampleable || state.overridden) return false
    if (video.dataset.nsfwFilterStatus === 'nsfw') return false
    if (!this.visible.has(video) || document.visibilityState !== 'visible') return false
    if (this.tooSmall(video)) return false
    // Once a frame of this media has been cleared, resample only as the footage
    // moves on. Everything that can happen to a video on a busy page routes
    // through here, so the interval is enforced here rather than per event.
    if (state.approved === state.generation) {
      const elapsed = video.currentTime - state.lastSampleTime
      if (elapsed >= 0 && elapsed < SAMPLE_INTERVAL) return false
    }

    return true
  }

  // A video nobody has judged yet goes ahead of one being resampled: the first
  // is showing frames behind the pending-hide stylesheet, the second is already
  // on screen and cleared.
  private nextDue (): HTMLVideoElement {
    for (const video of this.due) {
      if (this.stateOf(video).approved < 0) return video
    }

    return this.due.values().next().value as HTMLVideoElement
  }

  // One frame in flight per document. Frames are pulled from the DOM only when
  // their turn comes, so a page full of videos costs one canvas, not one each.
  private async drain (): Promise<void> {
    if (this.sampling) return
    this.sampling = true

    try {
      while (this.active && this.due.size > 0) {
        const video = this.nextDue()
        this.due.delete(video)
        if (!video.isConnected) {
          this.stateOf(video).observed = false
          this.viewport.unobserve(video)
          continue
        }

        // The queue is served one frame at a time, so what was worth sampling
        // when it was queued may have scrolled away or been judged since.
        if (!this.eligible(video, this.stateOf(video))) continue

        await this.sample(video)
      }
    } finally {
      this.sampling = false
    }
  }

  private async sample (video: HTMLVideoElement): Promise<void> {
    const state = this.stateOf(video)
    const generation = state.generation
    if (state.unsampleable || video.dataset.nsfwFilterStatus === 'nsfw') return

    // Until a frame of this media has been cleared, the element is hidden. Later
    // samples run behind a video the user is already watching: blocking on every
    // one of them would blink the page every ten seconds.
    const first = state.approved !== generation
    if (first) {
      video.dataset.nsfwFilterStatus = 'processing'
      this.hideElement(video)
    }

    const frame = await this.captureFrame(video, state)
    if (!this.stillCurrent(state, generation)) return
    if (frame === null) {
      if (first) this.markUnavailable(video)
      return
    }
    // From here there is decoded footage on screen behind the hide, so nothing
    // the poster says may put the element back until this verdict lands.
    if (first) state.framePending = true

    state.lastSampleTime = video.currentTime

    try {
      const { result } = await this.requestToAnalyzeImage(new PredictionRequest(frameKey(), frame))
      if (first) state.framePending = false
      if (!this.stillCurrent(state, generation)) return

      if (result) {
        this.block(video)
      } else {
        state.approved = generation
        if (first) this.reveal(video)
      }
    } catch {
      if (first) state.framePending = false
      if (this.stillCurrent(state, generation) && first) this.markUnavailable(video)
    }
  }

  // Filtering can be switched off, and the element can move to different media,
  // while a frame is in flight. Either way this verdict no longer applies.
  private stillCurrent (state: VideoState, generation: number): boolean {
    return this.active && !state.overridden && state.generation === generation
  }

  // null means no frame to classify: either none has decoded within the deadline,
  // or the canvas is tainted by media this document may not read back.
  private async captureFrame (video: HTMLVideoElement, state: VideoState): Promise<string | null> {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      const decoded = await this.waitForFrame(video)
      if (!decoded) return null
    }

    // A fresh canvas per capture: one tainted by a cross-origin video must not
    // fail every capture after it.
    const canvas = document.createElement('canvas')
    canvas.width = FRAME_SIZE
    canvas.height = FRAME_SIZE

    try {
      const context = canvas.getContext('2d')
      if (context === null) return null

      context.drawImage(video, 0, 0, FRAME_SIZE, FRAME_SIZE)

      return canvas.toDataURL('image/jpeg', FRAME_QUALITY)
    } catch {
      // SecurityError: cross-origin media without CORS, or DRM. The page can play
      // it, we cannot read it, and retrying costs the same every ten seconds.
      state.unsampleable = true

      return null
    }
  }

  private async waitForFrame (video: HTMLVideoElement): Promise<boolean> {
    return await new Promise(resolve => {
      const settle = (decoded: boolean): void => {
        window.clearTimeout(timer)
        video.removeEventListener('loadeddata', onLoaded)
        resolve(decoded)
      }
      const onLoaded = (): void => settle(true)

      const timer = window.setTimeout(() => settle(false), FRAME_DEADLINE)
      video.addEventListener('loadeddata', onLoaded)
    })
  }

  private classifyPoster (video: HTMLVideoElement, state: VideoState): void {
    const generation = state.generation
    const posterGeneration = state.posterGeneration
    const poster = video.poster
    const current = (): boolean =>
      this.stillCurrent(state, generation) && state.posterGeneration === posterGeneration && video.poster === poster

    this.requestToAnalyzeImage(new PredictionRequest(poster))
      .then(({ result }) => {
        if (!current()) return

        // A safe poster only clears the preview, never the footage behind it, so
        // it does not count as an approved frame, and it cannot reveal footage a
        // frame is still being judged for.
        if (result) this.block(video)
        else if (!state.framePending) this.reveal(video)
      })
      .catch(() => {
        if (current() && !state.framePending) this.reveal(video)
      })
  }

  private block (video: HTMLVideoElement): void {
    if (video.dataset.nsfwFilterStatus !== 'nsfw') this.blockedItems++
    video.dataset.nsfwFilterStatus = 'nsfw'
    this.due.delete(video)
    this.applyEffect(video)
    video.pause()
  }

  // A frame and a poster can be in flight together, and either can come back
  // first. Whichever loses the race must not put an unsafe video back on screen.
  private reveal (video: HTMLVideoElement): void {
    if (video.dataset.nsfwFilterStatus === 'nsfw') return

    video.dataset.nsfwFilterStatus = 'sfw'
    this.revealElement(video)
  }

  private markUnavailable (video: HTMLVideoElement): void {
    if (video.dataset.nsfwFilterStatus === 'nsfw') return

    video.dataset.nsfwFilterStatus = 'unavailable'
    this.revealElement(video)
  }
}
