// The classifiers the user can pick between in the popup. The id is what gets
// persisted in settings and sent to the offscreen document, so it must stay
// stable; renaming one silently resets that user's choice to the default.
//
// `ViT_NSFW_384` is a smaller, more accurate binary (NSFW vs SFW) ViT and the
// default; the strictness slider maps to a single decision threshold for it.
// `MobileNet_v1.2` is the original nsfwjs/gantman graph model (5-class, the
// slider tunes per-class thresholds), kept for users who prefer it. See
// src/offscreen for how each id maps to a Classifier.

export const TRAINED_MODELS = ['ViT_NSFW_384', 'MobileNet_v1.2'] as const

export type TrainedModel = typeof TRAINED_MODELS[number]

export const DEFAULT_TRAINED_MODEL: TrainedModel = 'ViT_NSFW_384'

export const TRAINED_MODEL_LABELS: Record<TrainedModel, string> = {
  ViT_NSFW_384: 'ViT-384 (default)',
  'MobileNet_v1.2': 'MobileNet (legacy)'
}

export const isTrainedModel = (value: unknown): value is TrainedModel =>
  typeof value === 'string' && (TRAINED_MODELS as readonly string[]).includes(value)
