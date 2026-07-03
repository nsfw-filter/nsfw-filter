import React from 'react'
import styled from 'styled-components'

// lucide "funnel", stroked (lucide's default look). The viewBox is cropped close
// to the glyph's bounds, padded by ~1 unit for the stroke, so the header controls
// the gap to the text rather than the icon's built-in 24px padding.
const PATH =
  'M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z'

const Svg = styled.svg`
  color: ${props => props.theme.accent};
  display: block;
  flex: none;
`

export const Logo: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <Svg
    width={(size * 23) / 22}
    height={size}
    viewBox="0.5 1.5 23 22"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    aria-label="NSFW Filter"
  >
    <path d={PATH} />
  </Svg>
)
