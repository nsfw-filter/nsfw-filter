import {
  TOGGLE_LOGGING,
  TOGGLE_DIV_FILTERING,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS,
  SET_WEBSITE_LIST,
  SET_MODEL_SIZE,
  SET_TOP_K_PREDICTIONS,
  TOGGLE_SHOW_PROBABILITY
} from './settingsTypes'

export const toggleLogging = () => ({ type: TOGGLE_LOGGING } as const)
export const toggleDivFiltering = () => ({ type: TOGGLE_DIV_FILTERING } as const)

export const setFilterEffect = (filterEffect: 'hide' | 'blur' | 'grayscale') => ({
  type: SET_FILTER_EFFECT,
  payload: { filterEffect }
} as const)

export const setTrainedModel = (trainedModel: 'MobileNetV2' | 'MobileNetV2Mid' | 'InceptionV3') => ({
  type: SET_TRAINED_MODEL,
  payload: { trainedModel }
} as const)

export const setFilterStrictness = (filterStrictness: number) => ({
  type: SET_FILTER_STRICTNESS,
  payload: { filterStrictness }
} as const)

export const setWebsiteList = (websites: string[]) => ({
  type: SET_WEBSITE_LIST,
  payload: { websites }
} as const)

export const setModelSize = (modelSize: number) => ({
  type: SET_MODEL_SIZE,
  payload: { modelSize }
} as const)

export const setTopKPredictions = (topK: number) => ({
  type: SET_TOP_K_PREDICTIONS,
  payload: { topK }
} as const)

export const toggleShowProbability = () => ({ type: TOGGLE_SHOW_PROBABILITY } as const)
