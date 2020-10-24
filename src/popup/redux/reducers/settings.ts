
import { SettingsActionTypes } from '../actions/settings'
import {
  TOGGLE_LOGGING,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS
} from '../actions/settings/settingsTypes'

export type SettingsState = {
  logging: boolean
  filterEffect: 'hide' | 'blur'
  trainedModel: 'mobile_v1.1'
  filterStrictness: number
}

const initialState: SettingsState = {
  logging: false,
  filterEffect: 'blur',
  trainedModel: 'mobile_v1.1',
  filterStrictness: 80
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
    default:
      return state
  }
}
