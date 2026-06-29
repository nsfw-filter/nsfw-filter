import { ConfigProvider, theme as antdTheme } from 'antd'
import React from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider, createGlobalStyle } from 'styled-components'

import { RootState } from '../redux/reducers'

// Paint the popup chrome itself (the window can be taller than the content, e.g.
// when Advanced is collapsed) so dark mode never leaks the default white page.
const GlobalStyle = createGlobalStyle`
  /* The popup is a fixed 320px column whose rows are width:100% + padding.
     Without border-box the padding adds outside the 320px, so every padded
     row spills past the edge and Chrome grows the popup window to ~800px,
     clipping the content. */
  *, *::before, *::after {
    box-sizing: border-box;
  }
  html, body, #popup {
    background-color: ${props => props.theme.bg.primary};
    color: ${props => props.theme.text.primary};
    margin: 0;
  }
`

const light = {
  bg: {
    primary: '#ffffff',
    surface: '#f6f6fb'
  },
  text: {
    primary: '#1d1d22',
    secondary: '#71717f'
  },
  accent: '#6366f1',
  border: '#ececf3',
  // The card surface is already near-white, so the default near-white track
  // vanishes into it. Sink the track a few shades and keep the selected thumb
  // pure white so the group reads as a distinct control.
  segmented: {
    track: '#e4e4ef',
    thumb: '#ffffff'
  }
}

const dark = {
  bg: {
    primary: '#1e262c',
    surface: '#232d35'
  },
  text: {
    primary: '#ffffff',
    secondary: '#9aa4b2'
  },
  // Lighter indigo so the accent keeps contrast on the dark background.
  accent: '#818cf8',
  border: '#2c3742',
  segmented: {
    track: '#19222a',
    thumb: '#323f4a'
  }
}

export const Theme: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const darkTheme = useSelector<RootState>(state => state.appearance.darkTheme)
  const theme = darkTheme === true ? dark : light

  return (
    <ConfigProvider
      theme={{
        algorithm: darkTheme === true ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: theme.accent,
          colorBgContainer: theme.bg.primary,
          colorBgElevated: theme.bg.surface,
          colorBorder: theme.border,
          colorText: theme.text.primary,
          colorTextQuaternary: theme.text.secondary,
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif"
        },
        components: {
          Segmented: {
            // Inset the thumb from the track edge; the inter-item gap lives in
            // Production/styles (EffectField).
            trackPadding: 4,
            trackBg: theme.segmented.track,
            itemSelectedBg: theme.segmented.thumb
          }
        }
      }}
    >
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </ConfigProvider>
  )
}
