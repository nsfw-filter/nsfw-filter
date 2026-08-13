import { TrainedModel } from '../../../../utils/models'
import { StoredSettingsPassword } from '../../../../utils/settingsPassword'

import {
  TOGGLE_LOGGING,
  TOGGLE_DIV_FILTERING,
  TOGGLE_ENABLED,
  SET_FILTER_EFFECT,
  SET_TRAINED_MODEL,
  SET_FILTER_STRICTNESS,
  SET_WEBSITE_LIST,
  SET_SETTINGS_PASSWORD,
  CLEAR_SETTINGS_PASSWORD
} from './settingsTypes'

export const toggleLogging = () => ({ type: TOGGLE_LOGGING } as const)
export const toggleDivFiltering = () => ({ type: TOGGLE_DIV_FILTERING } as const)
export const toggleEnabled = () => ({ type: TOGGLE_ENABLED } as const)

export const setFilterEffect = (filterEffect: 'hide' | 'blur' | 'grayscale') => ({
  type: SET_FILTER_EFFECT,
  payload: { filterEffect }
} as const)

export const setTrainedModel = (trainedModel: TrainedModel) => ({
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

export const setSettingsPassword = (settingsPassword: StoredSettingsPassword) => ({
  type: SET_SETTINGS_PASSWORD,
  payload: { settingsPassword }
} as const)

export const clearSettingsPassword = () => ({
  type: CLEAR_SETTINGS_PASSWORD
} as const)
