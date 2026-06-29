import { Moon, Sun } from 'lucide-react'
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { TOGGLE_THEME } from '../../redux/actions/appearance'
import { RootState } from '../../redux/reducers'
import { Logo } from '../Logo'
import { Container, Brand, Title, ThemeToggle } from './styles'

export const Header: React.FC = () => {
  const dispatch = useDispatch()
  const darkTheme = useSelector<RootState>(state => state.appearance.darkTheme) === true

  return (
    <Container>
      <Brand>
        <Logo size={18} />
        <Title>
          <span id="logo-first-letters">NSFW</span>
          <span> Filter</span>
        </Title>
      </Brand>
      <ThemeToggle aria-label="Toggle theme" aria-pressed={darkTheme} onClick={() => dispatch({ type: TOGGLE_THEME })}>
        {darkTheme ? <Sun size={16} /> : <Moon size={16} />}
      </ThemeToggle>
    </Container>
  )
}
