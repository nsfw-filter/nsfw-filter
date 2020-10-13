import ReduxedStorage from './ReduxedStorage'
import WrappedStorage from './WrappedStorage'

export const createChromeStore = ({ createStore }) => {
  const storage = new WrappedStorage({ chrome })
  storage.init()

  // @DOCS returns Promise
  return (reducer, initialState) => {
    const store = new ReduxedStorage({
      createStore,
      storage,
      reducer,
      initialState
    })

    return store.init()
  }
}
