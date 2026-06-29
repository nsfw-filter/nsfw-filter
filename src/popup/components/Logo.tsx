import React from 'react'

// The brand mark is the 🦺 emoji (a nod to "safe for work"). Rendered as a glyph
// so it stays crisp at any size and adds no bundled asset; the toolbar icons in
// dist/images are this same emoji rasterized.
export const Logo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <span role="img" aria-label="NSFW Filter" style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}>🦺</span>
)
