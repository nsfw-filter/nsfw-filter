// The classifiers the user can pick between in the popup. The id is what gets
// persisted in settings and sent to the offscreen document, so it must stay
// stable; renaming one silently resets that user's choice to the default.
//
// `MobileNet_v1.2` is the original nsfwjs/gantman graph model (5-class, the
// strictness slider tunes per-class thresholds). `ViT_NSFW_384` is a smaller,
// more accurate binary (NSFW vs SFW) ViT; the slider maps to a single decision
// threshold for it. See src/offscreen for how each id maps to a Classifier.

export const TRAINED_MODELS = ['MobileNet_v1.2', 'ViT_NSFW_384'] as const

export type TrainedModel = typeof TRAINED_MODELS[number]

export const DEFAULT_TRAINED_MODEL: TrainedModel = 'MobileNet_v1.2'

export const TRAINED_MODEL_LABELS: Record<TrainedModel, string> = {
  'MobileNet_v1.2': 'MobileNet (default)',
  ViT_NSFW_384: 'ViT-384 (more accurate)'
}

export const isTrainedModel = (value: unknown): value is TrainedModel =>
  typeof value === 'string' && (TRAINED_MODELS as readonly string[]).includes(value)
