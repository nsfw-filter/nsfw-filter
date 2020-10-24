import React from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider } from 'styled-components'

import { RootState } from '../redux/reducers'

const light = {
  bg: {
    primary: '#CFD6BF'
  },
  text: {
    primary: '#050505'
  }
}

const dark = {
  bg: {
    primary: '#282434'
  },
  text: {
    primary: '#E1E1E6'
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
