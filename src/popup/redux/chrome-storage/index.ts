import { Action, Reducer, StoreCreator } from 'redux'
import { setupReduxed } from 'reduxed-chrome-storage'

// reduxed-chrome-storage v3 takes a container `(preloadedState) => Store` plus
// options, and returns an async instantiator. We keep the old call shape
// `createChromeStore({ createStore })(rootReducer)` so the background, content,
// and popup entry points don't each need to know about setupReduxed. The reducer
// stays generic so its action union isn't widened to a bare `Reducer` (redux 5
// rejects that assignment on action contravariance).
export const createChromeStore = ({ createStore }: { createStore: StoreCreator }) =>
  <S, A extends Action, P>(rootReducer: Reducer<S, A, P>) =>
    setupReduxed(
      (preloadedState?: P) => createStore(rootReducer, preloadedState),
      {
        storageArea: 'local',
        storageKey: 'nsfw-filter-redux-storage'
      }
    )()
