import * as actions from './settingsActions'
export * from './settingsActions'

type InferValueTypes<T> = T extends { [key: string]: infer U } ? U : never

export type SettingsActionTypes = ReturnType<InferValueTypes<typeof actions>>
