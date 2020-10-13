import React from 'react'

import { Header } from './Header'
import { Production } from './Production'
import { Container } from './styles'
import { Testing } from './Testing'

export const Popup: React.FC = () => (
  <Container>
    <Header />
    <Production/>
    <Testing />
  </Container>
)
