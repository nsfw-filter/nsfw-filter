
import { SettingsActionTypes } from '../actions/settings'
import {
  TOGGLE_LOGGING,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS,
  SET_WEBSITE_LIST,
  SET_MODEL_SIZE,
  SET_TOP_K_PREDICTIONS,
  TOGGLE_SHOW_PROBABILITY
} from '../actions/settings/settingsTypes'

export type SettingsState = {
  logging: boolean
  filterEffect: 'hide' | 'blur' | 'grayscale'
  trainedModel: 'MobileNetV2' | 'MobileNetV2Mid' | 'InceptionV3'
  filterStrictness: number
  websites: string[]
  modelSize: number
  topKPredictions: number
  showProbability: boolean
}

const initialState: SettingsState = {
  logging: process.env.NODE_ENV === 'development',
  filterEffect: 'blur',
  trainedModel: 'MobileNetV2',
  filterStrictness: 55,
  websites: [],
  modelSize: 224, // Default for MobileNet, will be 299 for InceptionV3
  topKPredictions: 5, // How many predictions to get from model
  showProbability: false // Whether to show probability scores in UI
}

export function settings (state = initialState, action: SettingsActionTypes): SettingsState {
  switch (action.type) {
    case TOGGLE_LOGGING:
      return { ...state, logging: !state.logging }
    case SET_FILTER_EFFECT:
      return { ...state, filterEffect: action.payload.filterEffect }
    case SET_TRAINED_MODEL:
      // Auto-adjust model size based on selected model
      const modelSize = action.payload.trainedModel === 'InceptionV3' ? 299 : 224
      return { ...state, trainedModel: action.payload.trainedModel, modelSize }
    case SET_FILTER_STRICTNESS:
      return { ...state, filterStrictness: action.payload.filterStrictness }
    case SET_WEBSITE_LIST:
      return { ...state, websites: action.payload.websites }
    case SET_MODEL_SIZE:
      return { ...state, modelSize: action.payload.modelSize }
    case SET_TOP_K_PREDICTIONS:
      return { ...state, topKPredictions: action.payload.topK }
    case TOGGLE_SHOW_PROBABILITY:
      return { ...state, showProbability: !state.showProbability }
    default:
      return state
  }
}
