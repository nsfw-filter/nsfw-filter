// CSP-safe replacement for seedrandom's main entry.
//
// The real seedrandom (v2.4.x, pinned by @tensorflow/tfjs-core) runs
// `(0, eval)('this')` at module load to locate the global object. Under the
// Manifest V3 CSP (`script-src 'self' 'wasm-unsafe-eval'`, no 'unsafe-eval')
// that throws an uncaught EvalError, which aborts the offscreen document before
// it can register its message listener.
//
// TensorFlow.js only ever calls `seedrandom.alea(seed)`, and seedrandom's
// standalone `lib/alea.js` is completely eval-free, so we re-export just that.
const alea = require('seedrandom/lib/alea')

module.exports = alea
module.exports.alea = alea
