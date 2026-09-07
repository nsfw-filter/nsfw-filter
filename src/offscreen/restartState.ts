import { ILogger } from '../utils/Logger'
import { TrainedModel } from '../utils/models'

// The offscreen document cannot switch the TensorFlow.js backend in place, so it
// reloads itself onto WASM instead (see restartRealm in offscreen.ts). The
// reloaded document has no way back to the settings the service worker pushed,
// because the worker is still running and won't push them again, so they are
// handed over through sessionStorage.
export const RESTART_KEY = 'nsfw-filter-restart'

export type RestartState = {
  filterStrictness: number
  trainedModel: TrainedModel
  logging: boolean
}

export const saveRestartState = (storage: Storage, state: RestartState): void => {
  storage.setItem(RESTART_KEY, JSON.stringify(state))
}

// null means a first start, so the caller brings the document up on WebGL. A
// record we can't parse is treated the same way rather than trusted: coming up on
// defaults classifies images, and reloading again on a record that will never
// parse would not.
export const readRestartState = (storage: Storage, logger: ILogger): RestartState | null => {
  const saved = storage.getItem(RESTART_KEY)
  if (saved === null) return null

  try {
    return JSON.parse(saved) as RestartState
  } catch (error) {
    logger.error(error as Error)
    return null
  }
}
