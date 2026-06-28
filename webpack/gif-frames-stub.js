// Stub for @nsfw-filter/gif-frames. nsfwjs requires it at import time, which
// transitively loads `ndarray` whose `new Function` codegen violates the
// Manifest V3 CSP (no 'unsafe-eval'). We never call nsfwjs.classifyGif, so this
// no-op default keeps the module graph eval-free. Calling it would reject,
// which is fine because that code path is never reached.
module.exports = function gifFramesStub () {
  return Promise.reject(new Error('gif-frames is stubbed out in this build'))
}
module.exports.default = module.exports
