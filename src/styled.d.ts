import 'styled-components'

// styled-components 6 ships an empty DefaultTheme; declare our theme shape so
// `props.theme.*` is typed in every styled component. Mirrors the objects in
// popup/styles/Theme.tsx.
declare module 'styled-components' {
  export interface DefaultTheme {
    bg: {
      primary: string
      surface: string
    }
    text: {
      primary: string
      secondary: string
    }
    accent: string
    border: string
    segmented: {
      track: string
      thumb: string
    }
  }
}
