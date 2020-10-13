import styled from 'styled-components'

export const Container = styled.div`
  background-color: ${props => props.theme.bg.primary};
  color: ${props => props.theme.text.primary};
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  font-weight: 400;
  height: 100%;
  width: 300px;
`
