// CSP-safe replacement for seedrandom's main entry.
//
// seedrandom 2.4.x (pinned by @tensorflow/tfjs-core) runs `(0, eval)('this')` at
// module load to find the global object. Under the Manifest V3 CSP (no
// 'unsafe-eval') that throws an uncaught EvalError, which aborts the offscreen
// document before it can register its message listener.
//
// TensorFlow.js only calls `seedrandom.alea(seed)`, and seedrandom's standalone
// `lib/alea.js` is eval-free, so we re-export just that.
const alea = require('seedrandom/lib/alea')

module.exports = alea
module.exports.alea = alea
