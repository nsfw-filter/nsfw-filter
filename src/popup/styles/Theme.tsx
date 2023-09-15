import React from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider } from 'styled-components'

import { RootState } from '../redux/reducers'

const light = {
  bg: {
    primary: '#ffffff'
  },
  text: {
    primary: '#222222'
  }
}

const dark = {
  bg: {
    primary: '#1e262c'
  },
  text: {
    primary: '#ffffff'
  }
}

export const Theme: React.FC = ({ children }) => {
  const darkTheme = useSelector<RootState>(state => state.appearance.darkTheme)
  const theme = darkTheme === true ? dark : light

  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  )
}
