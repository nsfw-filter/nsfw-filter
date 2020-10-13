import BulbOutlined from '@ant-design/icons/lib/icons/BulbOutlined'
import React from 'react'
import { useDispatch } from 'react-redux'

import { TOGGLE_THEME } from '../../redux/actions/appearance'

import { Container, Title, ThemeToggle } from './styles'

export const Header: React.FC = () => {
  const dispatch = useDispatch()

  return (
    <Container>
      <Title>
        <span id="logo-first-letters">NSFW F</span>
        <span>ilter</span>
        <ThemeToggle>
          <BulbOutlined onClick={() => dispatch({ type: TOGGLE_THEME })} style={{ cursor: 'pointer' }} />
        </ThemeToggle>
      </Title>
    </Container>
  )
}
