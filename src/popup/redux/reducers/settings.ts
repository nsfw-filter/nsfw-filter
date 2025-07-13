
import { SettingsActionTypes } from '../actions/settings'
import {
  TOGGLE_LOGGING,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS,
  SET_WEBSITE_LIST,
  SET_TOP_K_PREDICTIONS,
  TOGGLE_SHOW_PROBABILITY_OVERLAY,
  SET_CLASS_THRESHOLD
} from '../actions/settings/settingsTypes'

export type SettingsState = {
  logging: boolean
  filterEffect: 'hide' | 'blur' | 'grayscale'
  trainedModel: 'MobileNetV2' | 'MobileNetV2Mid' | 'InceptionV3'
  filterStrictness: number
  websites: string[]
  topKPredictions: number
  showProbabilityOverlay: boolean
  classThresholds: {
    [className: string]: number
  }
}

const initialState: SettingsState = {
  logging: process.env.NODE_ENV === 'development',
  filterEffect: 'blur',
  trainedModel: 'MobileNetV2',
  filterStrictness: 55,
  websites: [],
  topKPredictions: 5,
  showProbabilityOverlay: false,
  classThresholds: {
    'Hentai': 0.6,
    'Porn': 0.4,
    'Sexy': 0.6,
    'Drawing': 0.8,  // Higher threshold since drawings are often false positives
    'Neutral': 0.9   // Very high threshold since this is the "safe" class
  }
}

export function settings (state = initialState, action: SettingsActionTypes): SettingsState {
  switch (action.type) {
    case TOGGLE_LOGGING:
      return { ...state, logging: !state.logging }
    case SET_FILTER_EFFECT:
      return { ...state, filterEffect: action.payload.filterEffect }
    case SET_TRAINED_MODEL:
      return { ...state, trainedModel: action.payload.trainedModel }
    case SET_FILTER_STRICTNESS:
      return { ...state, filterStrictness: action.payload.filterStrictness }
    case SET_WEBSITE_LIST:
      return { ...state, websites: action.payload.websites }
    case SET_TOP_K_PREDICTIONS:
      return { ...state, topKPredictions: action.payload.topK }
    case TOGGLE_SHOW_PROBABILITY_OVERLAY:
      return { ...state, showProbabilityOverlay: !state.showProbabilityOverlay }
    case SET_CLASS_THRESHOLD:
      return { 
        ...state, 
        classThresholds: {
          ...state.classThresholds,
          [action.payload.className]: action.payload.threshold
        }
      }
    default:
      return state
  }
}
