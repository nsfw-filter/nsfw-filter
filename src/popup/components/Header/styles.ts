import styled from 'styled-components'

export const Container = styled.div`
  align-items: center;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
  width: 100%;
`

export const Brand = styled.div`
  align-items: center;
  cursor: default;
  display: flex;
  gap: 8px;
`

export const Wordmark = styled.div`
  align-items: baseline;
  display: flex;
  gap: 6px;
`

export const Title = styled.div`
  color: ${props => props.theme.text.primary};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.01em;

  #logo-first-letters {
    color: ${props => props.theme.accent};
    font-weight: 700;
  }
`

export const Version = styled.span`
  color: ${props => props.theme.text.secondary};
  font-size: 11px;
  font-weight: 500;
`

export const ThemeToggle = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: ${props => props.theme.text.secondary};
  cursor: pointer;
  display: flex;
  justify-content: center;
  padding: 4px;

  &:hover {
    color: ${props => props.theme.text.primary};
  }
`
