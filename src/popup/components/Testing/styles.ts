import Checkbox from 'antd/lib/checkbox'
import styled from 'styled-components'

export const Container = styled.div`
  background-color: ${props => props.theme.bg.secondary};
  display: flex;
  flex-direction: column;
  padding: 0 15px 15px 15px;
  width: 100%;
`

export const Row = styled.div`
  align-content: center;
  display: flex;
  flex-direction: row;
  padding: 7px 0;
`

export const DropdownRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`

export const CheckboxArea = styled.div`
  align-content: center;
  display: flex;
  flex-direction: column;
  padding: 7px 0;
`

export const StyledCheckbox = styled(Checkbox)`
  color: ${props => props.theme.text.primary};
`

export const TestersTitle = styled.div`
  padding-bottom: 10px;
  padding-top: 10px;
  text-align: center;
`

export const BugReport = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding-top: 5px;

  span {
    padding-left: 5px;
    padding-right: 5px;

    a {
      color: inherit;
      text-decoration: underline;
    }
  }
`

export const Footer = styled.div`
  font-size: 12px; 
  padding-top: 7px;
  text-align: center;
`
