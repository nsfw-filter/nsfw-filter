import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  width: 100%;

  .ant-slider {
    margin: 6px 4px 0 4px;
  }
`

export const Stat = styled.div`
  cursor: default;
  text-align: center;
`

export const PowerRow = styled.div`
  align-items: center;
  background-color: ${props => props.theme.bg.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
`

export const PowerText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const PowerTitle = styled.span`
  color: ${props => props.theme.text.primary};
  font-size: 14px;
  font-weight: 600;
`

export const PowerHint = styled.span`
  color: ${props => props.theme.text.secondary};
  font-size: 12px;
`

export const StatNumber = styled.div`
  color: ${props => props.theme.accent};
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
`

export const StatCaption = styled.div`
  color: ${props => props.theme.text.secondary};
  font-size: 12px;
  margin-top: 2px;
`

export const Card = styled.div`
  background-color: ${props => props.theme.bg.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
`

// trackPadding only insets the control's outer edge; it leaves no space
// between options, so the selected thumb and a hovered neighbour touch. A flex
// gap on the group separates the item boxes. antd derives the thumb's position
// from each item's offset, so the gap keeps it aligned.
export const EffectField = styled(Field)`
  .ant-segmented-group {
    gap: 4px;
  }
`

export const FieldHead = styled.div`
  align-items: baseline;
  display: flex;
  justify-content: space-between;
`

export const FieldLabel = styled.span`
  color: ${props => props.theme.text.primary};
  font-size: 13px;
  font-weight: 500;
`

export const FieldValue = styled.span`
  color: ${props => props.theme.accent};
  font-size: 13px;
  font-weight: 600;
`

export const SliderEnds = styled.div`
  color: ${props => props.theme.text.secondary};
  display: flex;
  font-size: 11px;
  justify-content: space-between;
  margin-top: -2px;
`

export const AllowRow = styled.div`
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
`

export const AllowText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

export const AllowHost = styled.span`
  color: ${props => props.theme.text.secondary};
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ManageLink = styled.button`
  align-self: flex-start;
  background: none;
  border: none;
  color: ${props => props.theme.accent};
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  margin-top: 8px;
  padding: 2px;

  &:hover {
    text-decoration: underline;
  }
`

export const AdvancedToggle = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: ${props => props.theme.text.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: 13px;
  gap: 6px;
  padding: 2px;

  &:hover {
    color: ${props => props.theme.text.primary};
  }
`

export const AdvancedPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
`

export const AdvancedRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`
