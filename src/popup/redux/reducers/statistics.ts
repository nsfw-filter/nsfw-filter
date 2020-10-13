import { SET_TOTAL_BLOCKED, StatisticsActionTypes } from '../actions/statistics'

export type StatisticsState = {
  totalBlocked: number
}

const initialState: StatisticsState = {
  totalBlocked: 0
}

export const statistics = (state = initialState, action: StatisticsActionTypes): StatisticsState => {
  const { type, payload } = action
  switch (type) {
    case SET_TOTAL_BLOCKED:
      return { ...state, totalBlocked: payload.totalBlocked }
    default:
      return state
  }
}
