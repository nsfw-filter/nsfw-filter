import { TOGGLE_THEME, AppearanceActionTypes } from '../actions/appearance'

type AppearanceState = {
  darkTheme: boolean
}

const initialState: AppearanceState = {
  darkTheme: true
}

export const appearance = (state = initialState, action: AppearanceActionTypes): AppearanceState => {
  const { type } = action
  switch (type) {
    case TOGGLE_THEME:
      return {
        ...state,
        darkTheme: !state.darkTheme
      }
    default:
      return state
  }
}
