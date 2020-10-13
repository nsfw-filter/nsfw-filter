import {
  TOGGLE_LOGGING,
  TOGGLE_GIF_FILTERING,
  TOGGLE_DIV_FILTERING,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS,
  SET_CONCURRENCY
} from './settingsTypes'

export const toggleLogging = () => ({ type: TOGGLE_LOGGING } as const)
export const toggleGifFiltering = () => ({ type: TOGGLE_GIF_FILTERING } as const)
export const toggleDivFiltering = () => ({ type: TOGGLE_DIV_FILTERING } as const)

export const setFilterEffect = (filterEffect: 'hide' | 'blur') => ({
  type: SET_FILTER_EFFECT,
  payload: { filterEffect }
} as const)

export const setTrainedModel = (trainedModel: 'mobile_v1.0') => ({
  type: SET_TRAINED_MODEL,
  payload: { trainedModel }
} as const)

export const setFilterStrictness = (filterStrictness: number) => ({
  type: SET_FILTER_STRICTNESS,
  payload: { filterStrictness }
} as const)

export const setConcurrency = (concurrency: '1' | '2' | '3') => ({
  type: SET_CONCURRENCY,
  payload: { concurrency }
} as const)
