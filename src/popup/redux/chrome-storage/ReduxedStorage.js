import cloneDeep from 'lodash.clonedeep'
import isEqual from 'lodash.isequal'
import mergeWith from 'lodash.mergewith'

export default class ReduxedStorage {
  /**
   * Redux interface to chrome.storage
   * @param {Object} obj
   * @param {function(function()[, Object, function()])} obj.createStore the Redux's createStore() function
   * @param {Object} obj.storage a WrappedStorage instance
   * @param {number} obj.bufferLife lifetime of the bulk actions buffer, in ms
   * @param {function(Object[, Object])} obj.reducer a reducing function
   * @param {Object} obj.initialState initial state of the store
   */
  constructor ({ createStore, storage, reducer, initialState }) {
    this.createStore = createStore
    this.storage = storage
    this.reducer = reducer
    this.buffLife = 100
    this.state = initialState
    this.buffStore = this.buffState0 = null
    this.listeners = []
    this.dispatch = this.dispatch.bind(this)
    this.subscribe = this.subscribe.bind(this)
  }

  init () {
    const initialState = this.state
    this.state = null
    const defaultState = this.createStore(this.reducer, undefined).getState()

    // Subscribe for changes in chrome.storage
    this.storage.subscribe(data => {
      if (isEqual(data, this.state)) return

      this.setState(data)
      for (const fn of this.listeners) {
        fn()
      }
    })

    // return a promise to be resolved when the last state (if any) is restored from chrome.storage
    return new Promise(resolve => {
      // Try to restore the last state stored in chrome.storage, if any
      this.storage.load(lastState => {
        const mergeOrReplace = (data0, data) =>
          typeof data0 === 'object' && !Array.isArray(data0)
            ? mergeWith({}, data0, data, (obj, src) => Array.isArray(obj) ? src : undefined)
            : data

        let state = lastState ? mergeOrReplace(defaultState, lastState) : defaultState

        if (initialState) state = mergeOrReplace(state, initialState)

        this.setState(state)

        if (!isEqual(state, lastState)) this.storage.save(state)

        resolve(this)
      })
    })
  }

  /**
   * Sets/replaces all the state to/with a new content
   * @param data a new content of the state
   */
  setState (data) {
    if (!data) return

    this.state = cloneDeep(data)
  }

  /**
   * Returns the current state
   * @returns {Object} the current state
   */
  getState () {
    return this.state
  }

  /**
   * Adds a listener for changes in the store
   * @param {function()} fn the listener
   * @returns {function()} a function that unsubscribes the listener
   */
  subscribe (fn) {
    typeof fn === 'function' && this.listeners.push(fn)

    return () => {
      if (typeof fn !== 'function') return

      this.listeners = this.listeners.filter(v => v !== fn)
    }
  }

  /**
   * Dispatches a Redux action
   * @param {Object} action the Redux action
   * @returns {Object} the dispatched action
   */
  dispatch (action) {
    if (!this.buffStore) {
      this.buffStore = this.createStore(this.reducer, this.state)
      this.buffState0 = this.buffStore.getState()

      setTimeout(() => { this.buffStore = null }, this.buffLife)
    }

    this.buffStore.subscribe(() => {
      const state = this.buffStore.getState()
      if (isEqual(state, this.buffState0)) return

      this.storage.save(state)
      this.buffState0 = state
    })

    return this.buffStore.dispatch(action)
  }
}
