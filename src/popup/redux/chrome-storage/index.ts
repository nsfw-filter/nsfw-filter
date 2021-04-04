import { StoreCreator } from 'redux'
import storeCreatorFactory from 'reduxed-chrome-storage'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createChromeStore = ({ createStore }: { createStore: StoreCreator }) => {
  const options = {
    createStore,
    storageArea: 'local',
    storageKey: 'nsfw-filter-redux-storage'
  }

  // @ts-expect-error StorageAreaName
  const asyncStoreCreator = storeCreatorFactory(options)

  return asyncStoreCreator
}
