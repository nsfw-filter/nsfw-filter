import React, { useEffect } from 'react'
import './Popup.scss'

export const Popup = (): JSX.Element => {
  useEffect(() => {
    console.log('asd')
    // Example of how to send a message to eventPage.ts.
    // chrome.runtime.sendMessage({ popupMounted: true })
  }, [])

  return <div className="popupContainer">Hello, world!</div>
}
