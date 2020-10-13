export default class WrappedStorage {
  /**
     * chrome.storage API wrapper
     * @param {Object} obj
     * @param {Object} obj.chrome Chrome host object
     * @param {string} obj.area the name of chrome.storage area to be used
     * @param {string} obj.key the key to be used for storing/tracking data in chrome.storage
     */
  constructor ({ chrome, area, key }) {
    this.chrome = chrome
    this.key = key || 'nsfw-filter-redux-storage'
    this.areaName = 'local'
    this.areaApi = this.chrome.storage[this.areaName]
    this.listeners = []
  }

  init () {
    // Setup internal (shared) listener for chrome.storage.onChanged
    this.chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== this.areaName || !(this.key in changes)) return

      const { newValue } = changes[this.key]
      if (!newValue) return

      for (const fn of this.listeners) {
        fn(newValue)
      }
    })
  }

  /**
     * Adds a listener for chrome.storage.onChanged
     * @param {function(Object)} fn the listener function
     */
  subscribe (fn) {
    typeof fn === 'function' && this.listeners.push(fn)
  }

  /**
     * Retrieves data from chrome.storage under specific key (this.key)
     * @param {function(Object)} fn a callback function to pass the retrieved data
     */
  load (fn) {
    typeof fn === 'function' &&
      this.areaApi.get(this.key, data => {
        fn(!this.chrome.runtime.lastError && data && data[this.key])
      })
  }

  /**
     * Stores data in chrome.storage under specific key (this.key)
     * @param {Object} data the data to store
     */
  save (data) {
    this.areaApi.set({ [this.key]: data })
  }
}
