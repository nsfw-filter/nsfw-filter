import React from 'react'

import { Footer } from './Footer'
import { Header } from './Header'
import { Production } from './Production'
import { Container } from './styles'

export const Popup: React.FC = () => (
  <Container>
    <Header />
    <Production/>
    <Footer />
  </Container>
)
