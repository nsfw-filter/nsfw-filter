// Reject if `promise` doesn't settle within `ms`, so a hang (not just a thrown
// error) in WebGL init, model warm-up, or a single classification can't wedge
// the offscreen document, e.g. a buggy GPU driver that never returns from a
// read-back. On timeout the wrapped promise rejects and the caller recovers.
export const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })
}
