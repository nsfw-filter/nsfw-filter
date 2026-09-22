import { PENDING_HIDE_RULES } from './DOMWatcher/pendingStyle'
import { CANVAS_DRAWN, SHADOW_ROOT_CREATED } from './mediaChanges'

// These APIs do not produce DOM mutations. Notify the isolated content script
// before paint; all pixel inspection and filtering decisions stay there.
const attachShadow = Element.prototype.attachShadow
// Setting root.innerHTML must not remove the protection before startup finishes.
const shadowStyle = new CSSStyleSheet()
shadowStyle.replaceSync(PENDING_HIDE_RULES)
Element.prototype.attachShadow = function (options) {
  const root = attachShadow.call(this, options)
  // A root in another document paints nothing here, and adopting a sheet this
  // document constructed would throw inside the page's own attachShadow call.
  if (this.ownerDocument === document) {
    root.adoptedStyleSheets.push(shadowStyle)
    // The host, not the root: a closed root reached through this event would be
    // one the page cannot otherwise get to. The isolated side resolves it itself.
    document.dispatchEvent(new CustomEvent(SHADOW_ROOT_CREATED, { detail: this }))
  }
  return root
}

const drawn = new Set<HTMLCanvasElement>()
const notifyDrawing = (canvas: HTMLCanvasElement): void => {
  if (!canvas.isConnected) return
  const scheduled = drawn.size > 0
  drawn.add(canvas)
  if (scheduled) return
  // A frame often clears and redraws the same canvas many times. Inspect its
  // completed drawing once, after those calls and before the browser paints it.
  queueMicrotask(() => {
    const batch = [...drawn]
    drawn.clear()
    for (const canvas of batch) {
      canvas.dispatchEvent(new Event(CANVAS_DRAWN, { bubbles: true, composed: true }))
    }
  })
}

const watchDrawing = (prototype: object, methods: string[]): void => {
  for (const method of methods) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, method)
    const draw = descriptor?.value
    if (typeof draw !== 'function') continue
    Object.defineProperty(prototype, method, {
      ...descriptor,
      value: function (this: { canvas: HTMLCanvasElement | OffscreenCanvas }, ...args: unknown[]) {
        const result: unknown = Reflect.apply(draw, this, args)
        if (this.canvas instanceof HTMLCanvasElement) notifyDrawing(this.canvas)
        return result
      }
    })
  }
}

watchDrawing(CanvasRenderingContext2D.prototype, [
  'clearRect', 'fillRect', 'strokeRect', 'drawImage', 'putImageData',
  'fill', 'stroke', 'fillText', 'strokeText', 'reset'
])
watchDrawing(ImageBitmapRenderingContext.prototype, ['transferFromImageBitmap'])
watchDrawing(WebGLRenderingContext.prototype, ['clear', 'drawArrays', 'drawElements'])
watchDrawing(WebGL2RenderingContext.prototype, [
  'clear', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced',
  'drawRangeElements', 'blitFramebuffer', 'clearBufferfv', 'clearBufferiv', 'clearBufferuiv', 'clearBufferfi'
])
