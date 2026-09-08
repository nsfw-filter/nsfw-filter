import styled from 'styled-components'

import { Card, ManageLink } from '../Production/styles'

export { AdvancedRow as LockRow, FieldLabel as LockLabel } from '../Production/styles'

export const LockCard = styled(Card)`
  margin: 0;
`

export const LockLink = styled(ManageLink)`
  margin-top: 0;
  white-space: nowrap;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
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
  color: ${props => props.theme.error};
  font-size: 12px;
`

export const LockFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
`

export const LockForm = styled(LockFields).attrs({ as: 'form' })``

export const LockField = styled(LockFields).attrs({ as: 'label' })`
  gap: 4px;
`

export const LockActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const LockWarning = styled(LockHint)`
  display: flex;
  gap: 8px;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`
