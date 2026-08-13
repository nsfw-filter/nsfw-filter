import styled from 'styled-components'

export const LockCard = styled.form`
  background-color: ${props => props.theme.bg.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 14px;
`

export const LockTitle = styled.span`
  align-items: center;
  color: ${props => props.theme.text.primary};
  display: flex;
  font-size: 14px;
  font-weight: 600;
  gap: 6px;
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
  margin: 0;
`

export const LockForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
`

export const LockTextButton = styled.button`
  align-self: flex-start;
  background: none;
  border: none;
  color: ${props => props.theme.text.secondary};
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  padding: 2px;

  &:hover {
    color: ${props => props.theme.text.primary};
  }
`

export const LockActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const LockRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`

export const LockLabel = styled.span`
  color: ${props => props.theme.text.primary};
  font-size: 13px;
  font-weight: 500;
`
