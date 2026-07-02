import { TrainedModel } from '../../utils/models'

export type ClassifierSettings = {
  filterStrictness: number
}

// One loaded model living in the offscreen document. offscreen.ts owns the tfjs
// backend (WebGL/WASM) and the prediction serialization; a Classifier owns just
// the weights, preprocessing, and the block/allow decision for one `trainedModel`.
// Switching models = disposing one Classifier and loading another, so every
// implementation must release its tfjs tensors in dispose().
export type Classifier = {
  readonly trainedModel: TrainedModel

  // Load the weights on whatever backend is currently active and run one
  // warm-up classification (which compiles kernels and, on WebGL, proves the
  // full graph actually runs there). Returns false WITHOUT throwing if warm-up
  // fails and `requireWarm` is set, so the caller can drop to WASM and retry;
  // a false return must leave nothing allocated. Throws only on a hard load error.
  load: (requireWarm: boolean) => Promise<boolean>

  predict: (image: HTMLImageElement, url: string) => Promise<boolean>

  setSettings: (settings: ClassifierSettings) => void

  dispose: () => void
}

// Warm-up doubles as WebGL validation: a small probe op can succeed on a GPU
// that then hangs on the real graph, so we time-box the first full classify.
export const WARMUP_TIMEOUT = 8000

// Weights load from bundled local files, but a stalled GPU weight upload or disk
// read would still wedge the (serialised) op chain, since bring-up runs on it.
// Time-box the load so a hang recovers via bringUpClassifier's retry instead of
// pinning the offscreen document.
export const MODEL_LOAD_TIMEOUT = 15000
