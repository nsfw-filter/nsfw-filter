import styled from 'styled-components'

export const Container = styled.div`
  align-items: center;
  background-color: ${props => props.theme.bg.primary};
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px 11px 16px;
  width: 100%;
`

export const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: center;
`

export const Link = styled.a`
  align-items: center;
  color: ${props => props.theme.accent};
  display: flex;
  font-size: 12px;
  gap: 6px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`
