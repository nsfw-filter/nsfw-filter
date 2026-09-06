
import { DEFAULT_TRAINED_MODEL, isTrainedModel, TrainedModel } from '../../../utils/models'
import { SettingsActionTypes } from '../actions/settings'
import {
  TOGGLE_LOGGING,
  TOGGLE_ENABLED,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS,
  SET_WEBSITE_LIST
} from '../actions/settings/settingsTypes'

export type SettingsState = {
  enabled: boolean
  logging: boolean
  filterEffect: 'hide' | 'blur' | 'grayscale'
  trainedModel: TrainedModel
  filterStrictness: number
  websites: string[]
}

const initialState: SettingsState = {
  enabled: true,
  logging: process.env.NODE_ENV === 'development',
  filterEffect: 'blur',
  trainedModel: DEFAULT_TRAINED_MODEL,
  filterStrictness: 55,
  websites: []
}

export function settings (state = initialState, action: SettingsActionTypes): SettingsState {
  // Persisted state from an older version may be missing keys added later (e.g.
  // `enabled`). reduxed-chrome-storage hydrates from storage as-is, so backfill
  // defaults; otherwise a missing `enabled` reads as undefined and silently
  // disables filtering after an upgrade. Only allocate when a key is actually
  // missing, so unrelated actions keep the same `settings` reference.
  const hydrated = (state as Partial<SettingsState>).enabled !== undefined
  let s = hydrated ? state : { ...initialState, ...state }
  // A model removed in a later version (or a downgrade) would leave an id the
  // offscreen document can't load; reset it so classification never wedges.
  if (!isTrainedModel(s.trainedModel)) s = { ...s, trainedModel: DEFAULT_TRAINED_MODEL }
  switch (action.type) {
    case TOGGLE_ENABLED:
      return { ...s, enabled: !s.enabled }
    case TOGGLE_LOGGING:
      return { ...s, logging: !s.logging }
    case SET_FILTER_EFFECT:
      return { ...s, filterEffect: action.payload.filterEffect }
    case SET_TRAINED_MODEL:
      return { ...s, trainedModel: action.payload.trainedModel }
    case SET_FILTER_STRICTNESS:
      return { ...s, filterStrictness: action.payload.filterStrictness }
    case SET_WEBSITE_LIST:
      return { ...s, websites: action.payload.websites }
    default:
      return s
  }
}
