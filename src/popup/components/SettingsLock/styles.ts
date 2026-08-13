import styled from 'styled-components'

export const LockCard = styled.div`
  background-color: ${props => props.theme.bg.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
`

export const LockTitle = styled.span`
  color: ${props => props.theme.text.primary};
  font-size: 14px;
  font-weight: 600;
`

export const LockHint = styled.span`
  color: ${props => props.theme.text.secondary};
  font-size: 12px;
  line-height: 1.4;
`

export const LockError = styled.span`
  color: #d4534a;
  font-size: 12px;
`

export const LockFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const LockActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`
