import { PredictionRequest } from '../../utils/messages'
import { mediaElements } from '../mediaRoots'

import { Filter, OFFSCREEN_MARGIN } from './Filter'

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
const FRAME_PRESENTATION_TIMEOUT = 250
// Sampling follows media time, not wall time: a paused or buffering video is not
// showing anything new, and a 2x playback is showing it twice as fast.
const SAMPLE_INTERVAL = 1

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
      if (video.dataset.nsfwFilterStatus !== undefined) this.reset(video, this.stateOf(video))
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

      // Decoding can finish before the viewport observer reports this video, so
      // anything already on screen stays hidden until it has been inspected.
      if (video.poster.length > 0 || video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        video.dataset.nsfwFilterStatus = 'processing'
        this.hideElement(video)
        if (video.poster.length > 0) void this.classifyPoster(video, state)
      } else {
        // Nothing decoded and no poster: nothing is on screen to judge yet, and
        // the element needs a status or the pending rule keeps hiding it. The
        // first decoded frame is hidden by schedule().
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
    void this.classifyPoster(video, state)
  }

  // User-initiated unhide from the right-click menu. Sampling stops until the
  // element plays different media: re-blocking what the user just revealed would
  // make the menu item useless.
  public revealVideo (video: HTMLVideoElement): void {
    const state = this.stateOf(video)
    state.approved = state.generation
    state.overridden = true
    this.due.delete(video)

    this.revealElement(video)
    video.dataset.nsfwFilterStatus = 'sfw'
  }

  public applyEffectToBlocked (): void {
    const blocked = mediaElements<HTMLVideoElement>(
      'video[data-nsfw-filter-status="nsfw"],video[data-nsfw-filter-status="unavailable"]'
    )
    blocked.forEach(video => this.applyEffect(video))
  }

  // A verdict reached while filtering was on does not survive being turned off
  // and on again, the same way images are reclassified rather than trusted. The
  // user's unhide goes with it, or the next verdict is dropped and the video
  // stays hidden.
  public revealAll (): void {
    const filtered = mediaElements<HTMLVideoElement>('video[data-nsfw-filter-status]')
    filtered.forEach(video => this.reset(video, this.stateOf(video)))
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
      if (this.isBlocked(video)) {
        video.pause()
        return
      }
      this.schedule(video)
    })
    // The first decoded frame is on screen whether or not anything is playing.
    video.addEventListener('loadeddata', () => this.schedule(video))
    // Seeking exposes a frame nothing has judged, including while paused.
    video.addEventListener('seeking', () => {
      if (!this.active || state.overridden || state.unsampleable) return
      if (video.dataset.nsfwFilterStatus === 'nsfw') return
      // A loop returns to footage from the same source. Cancelling every pending
      // verdict on each lap would keep a short safe loop hidden indefinitely.
      if (video.loop && video.currentTime === 0) {
        state.lastSampleTime = Number.NEGATIVE_INFINITY
        return
      }
      state.generation++
      state.approved = -1
      state.lastSampleTime = Number.NEGATIVE_INFINITY
      state.framePending = true
      video.dataset.nsfwFilterStatus = 'processing'
      this.hideElement(video)
    })
    video.addEventListener('seeked', () => this.schedule(video))
    video.addEventListener('timeupdate', () => this.schedule(video))
    video.addEventListener('enterpictureinpicture', () => {
      if (this.isBlocked(video)) {
        video.pause()
        this.exitPictureInPicture(video)
      } else {
        this.schedule(video)
      }
    })
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
    return this.belowMinSize(video.clientWidth, video.clientHeight)
  }

  private schedule (video: HTMLVideoElement): void {
    const state = this.stateOf(video)
    if (!this.active || state.overridden || state.unsampleable) return
    if (this.isBlocked(video)) return

    // Hide decoded footage before checking viewport eligibility: intersection
    // callbacks may arrive after its first paint, including behind a safe poster.
    if (state.approved !== state.generation &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !this.tooSmall(video)) {
      state.framePending = true
      video.dataset.nsfwFilterStatus = 'processing'
      this.hideElement(video)
    }
    if (!this.eligible(video, state)) return
    this.due.add(video)
    void this.drain()
  }

  private eligible (video: HTMLVideoElement, state: VideoState): boolean {
    if (!this.active || state.unsampleable || state.overridden) return false
    if (this.isBlocked(video)) return false
    const pictureInPicture = document.pictureInPictureElement === video
    if (!pictureInPicture && (!this.visible.has(video) || document.visibilityState !== 'visible')) return false
    // Empty placeholders must not delay videos that already have pixels to read.
    if (video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false
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
    if (state.unsampleable || this.isBlocked(video)) return

    // Until a frame of this media has been cleared, the element is hidden. Later
    // samples run behind a video the user is already watching: blocking on every
    // one of them would blink the page on every sample.
    const first = state.approved !== generation
    if (first) {
      video.dataset.nsfwFilterStatus = 'processing'
      this.hideElement(video)
    }

    const frame = await this.captureFrame(video, state)
    if (!this.stillCurrent(state, generation)) return
    if (frame === null) {
      state.framePending = false
      this.markUnavailable(video)
      return
    }
    // From here there is decoded footage on screen behind the hide, so nothing
    // the poster says may put the element back until this verdict lands.
    if (first) state.framePending = true

    state.lastSampleTime = video.currentTime

    try {
      const { result, error } = await this.requestToAnalyzeImage(new PredictionRequest(frameKey(), frame))
      if (!this.stillCurrent(state, generation)) return
      if (first) state.framePending = false

      if (error !== undefined) {
        this.markUnavailable(video)
      } else if (result) {
        this.block(video)
      } else {
        state.approved = generation
        if (first) this.reveal(video)
      }
    } catch {
      if (!this.stillCurrent(state, generation)) return
      if (first) state.framePending = false
      this.markUnavailable(video)
    }
  }

  // Filtering can be switched off, and the element can move to different media,
  // while a frame is in flight. Either way this verdict no longer applies.
  private stillCurrent (state: VideoState, generation: number): boolean {
    return this.active && !state.overridden && state.generation === generation
  }

  // Only decoded videos enter the queue. null means this document cannot read
  // their pixels, even though Chrome can play them.
  private async captureFrame (video: HTMLVideoElement, state: VideoState): Promise<string | null> {
    const generation = state.generation
    // loadeddata can precede presentation: canvas would then contain black
    // pixels, not the decoded frame. A paused frame may already be presented and
    // produce no further callback, so bound this wait.
    if (state.approved !== state.generation && typeof video.requestVideoFrameCallback === 'function') {
      await new Promise<void>(resolve => {
        // Each side cancels the other, so the handle is in place before either
        // can run rather than being read out of its own declaration.
        let frameCallback = 0
        const timer = setTimeout(() => {
          video.cancelVideoFrameCallback(frameCallback)
          resolve()
        }, FRAME_PRESENTATION_TIMEOUT)
        frameCallback = video.requestVideoFrameCallback(() => {
          clearTimeout(timer)
          resolve()
        })
      })
    }
    if (state.generation !== generation) return null

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
      // it, we cannot read it, and retrying cannot change that.
      state.unsampleable = true

      return null
    }
  }

  // A safe poster only clears the preview, never the footage behind it: it does
  // not count as an approved frame, and it cannot speak for a frame still being
  // judged. A blocked poster blocks regardless, since it is what is on screen.
  private async classifyPoster (video: HTMLVideoElement, state: VideoState): Promise<void> {
    const generation = state.generation
    const posterGeneration = state.posterGeneration
    const poster = video.poster
    const current = (): boolean =>
      this.stillCurrent(state, generation) &&
      state.posterGeneration === posterGeneration && video.poster === poster

    let blocked = false
    let unavailable = false
    try {
      const { result, error } = await this.requestToAnalyzeImage(new PredictionRequest(poster))
      blocked = result
      unavailable = error !== undefined
    } catch {
      unavailable = true
    }

    if (!current()) return
    if (blocked) {
      this.block(video)
      return
    }
    if (state.framePending) return
    if (!unavailable) {
      this.reveal(video)
      return
    }
    // An unreadable poster says nothing about the footage behind it, so let a
    // frame decide. Only media whose pixels cannot be read at all is unavailable.
    if (state.unsampleable) this.markUnavailable(video)
    else this.schedule(video)
  }

  private block (video: HTMLVideoElement): void {
    if (video.dataset.nsfwFilterStatus !== 'nsfw') this.blockedItems++
    video.dataset.nsfwFilterStatus = 'nsfw'
    this.due.delete(video)
    this.applyEffect(video)
    video.pause()
    this.exitPictureInPicture(video)
  }

  // A frame and a poster can be in flight together, and either can come back
  // first. Whichever loses the race must not put an unsafe video back on screen.
  private reveal (video: HTMLVideoElement): void {
    if (this.isBlocked(video)) return

    video.dataset.nsfwFilterStatus = 'sfw'
    this.revealElement(video)
  }

  private markUnavailable (video: HTMLVideoElement): void {
    if (video.dataset.nsfwFilterStatus === 'nsfw') return

    video.dataset.nsfwFilterStatus = 'unavailable'
    this.applyEffect(video)
    video.pause()
    this.exitPictureInPicture(video)
  }

  private exitPictureInPicture (video: HTMLVideoElement): void {
    if (document.pictureInPictureElement !== video) return
    void document.exitPictureInPicture().catch(() => undefined)
  }
}
