import { DEFAULT_TRAINED_MODEL, isTrainedModel, TrainedModel } from '../../../utils/models'
import { isStoredSettingsPassword, StoredSettingsPassword } from '../../../utils/settingsPassword'
import { SettingsActionTypes } from '../actions/settings'
import {
  TOGGLE_LOGGING,
  TOGGLE_ENABLED,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS,
  SET_WEBSITE_LIST,
  SET_SETTINGS_PASSWORD,
  CLEAR_SETTINGS_PASSWORD
} from '../actions/settings/settingsTypes'

export type SettingsState = {
  enabled: boolean
  logging: boolean
  filterEffect: 'hide' | 'blur' | 'grayscale'
  trainedModel: TrainedModel
  filterStrictness: number
  websites: string[]
  settingsPassword: StoredSettingsPassword | null
}

const initialState: SettingsState = {
  enabled: true,
  logging: process.env.NODE_ENV === 'development',
  filterEffect: 'blur',
  trainedModel: DEFAULT_TRAINED_MODEL,
  filterStrictness: 55,
  websites: [],
  settingsPassword: null
}

export function settings (state = initialState, action: SettingsActionTypes): SettingsState {
  // Persisted state from an older version may be missing keys added later (e.g.
  // `enabled`). reduxed-chrome-storage hydrates from storage as-is, so backfill
  // defaults; otherwise a missing `enabled` reads as undefined and silently
  // disables filtering after an upgrade. Only allocate when a key is actually
  // missing, so unrelated actions keep the same `settings` reference.
  const partial = state as Partial<SettingsState>
  const hydrated = partial.enabled !== undefined && 'settingsPassword' in state
  let s = hydrated ? state : { ...initialState, ...state }
  // A model removed in a later version (or a downgrade) would leave an id the
  // offscreen document can't load; reset it so classification never wedges.
  if (!isTrainedModel(s.trainedModel)) s = { ...s, trainedModel: DEFAULT_TRAINED_MODEL }
  // Garbage or a partial write in storage should fail open (no lock) rather
  // than wedge the popup on a record we cannot verify.
  if (s.settingsPassword !== null && !isStoredSettingsPassword(s.settingsPassword)) {
    s = { ...s, settingsPassword: null }
  }
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
    case SET_SETTINGS_PASSWORD:
      return { ...s, settingsPassword: action.payload.settingsPassword }
    case CLEAR_SETTINGS_PASSWORD:
      return { ...s, settingsPassword: null }
    default:
      return s
  }
}
