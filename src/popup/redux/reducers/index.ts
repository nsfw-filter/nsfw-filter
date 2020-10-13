import { combineReducers } from 'redux'

import { appearance } from './appearance'
import { settings } from './settings'
import { statistics } from './statistics'

export const rootReducer = combineReducers({
  appearance,
  settings,
  statistics
})

export type RootState = ReturnType<typeof rootReducer>
