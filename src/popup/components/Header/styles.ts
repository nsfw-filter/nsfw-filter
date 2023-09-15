import styled from 'styled-components'

export const Container = styled.div`
  padding: 15px 15px 15px 15px;
  width: 100%;
`

export const Title = styled.div`
  cursor: default;
  font-family: 'Roboto', sans-serif;
  font-size: 26px;
  font-weight: 400;
  text-align: center;

  #logo-first-letters {
    font-weight: 700;
  }
`

export const ThemeToggle = styled.div`
  margin: 15px 15px;
  position: absolute;
  right: 0;
  top: 0;
  transform: scale(0.8);
`
