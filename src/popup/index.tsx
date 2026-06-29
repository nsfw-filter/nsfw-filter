import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { createStore } from 'redux'

import { Popup } from './components'
import { createChromeStore } from './redux/chrome-storage'
import { rootReducer } from './redux/reducers'
import { Theme } from './styles/Theme'

chrome.tabs.query({ active: true, currentWindow: true }, _tab => {
  (async () => {
    chrome.runtime.connect()
    const store = await createChromeStore({ createStore })(rootReducer)

    const container = document.getElementById('popup')
    if (container === null) return

    createRoot(container).render(
      <Provider store={store}>
        <Theme>
          <Popup />
        </Theme>
      </Provider>
    )
  })()
})
