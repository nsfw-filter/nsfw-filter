import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { createStore } from 'redux'

import { createChromeStore } from '../popup/redux/chrome-storage'
import { rootReducer } from '../popup/redux/reducers'
import { Theme } from '../popup/styles/Theme'

import { Options } from './components/Options'

;(async () => {
  const store = await createChromeStore({ createStore })(rootReducer)

  const container = document.getElementById('options')
  if (container === null) return

  createRoot(container).render(
    <Provider store={store}>
      <Theme>
        <Options />
      </Theme>
    </Provider>
  )
})()
