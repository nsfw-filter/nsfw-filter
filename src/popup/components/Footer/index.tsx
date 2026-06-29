import { Bug, Heart, Star } from 'lucide-react'
import React from 'react'

import { Container, Links, Link } from './styles'

export const Footer: React.FC = () => {
  return (
    <Container>
      <Links>
        <Link rel="noreferrer" target="_blank" href="https://github.com/nsfw-filter/nsfw-filter">
          <Star size={15} /> Star on GitHub
        </Link>
        <Link rel="noreferrer" target="_blank" href="https://github.com/nsfw-filter/nsfw-filter/issues">
          <Bug size={15} /> Report a bug
        </Link>
        <Link rel="noreferrer" target="_blank" href="https://www.patreon.com/nsfwfilter">
          <Heart size={15} /> Sponsor on Patreon
        </Link>
      </Links>
    </Container>
  )
}
