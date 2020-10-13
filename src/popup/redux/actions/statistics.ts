export const SET_TOTAL_BLOCKED = 'SET_TOTAL_BLOCKED'

export const setTotalBlocked = (totalBlocked: number) => ({
  type: SET_TOTAL_BLOCKED,
  payload: { totalBlocked }
} as const)

export type StatisticsActionTypes = ReturnType<typeof setTotalBlocked>
