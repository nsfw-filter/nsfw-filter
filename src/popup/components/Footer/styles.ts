import 'antd/lib/checkbox/style/index.css'

import Checkbox from 'antd/lib/checkbox'
import styled from 'styled-components'

export const Container = styled.div`
  background-color: ${props => props.theme.bg.primary};
  display: flex;
  flex-direction: column;
  padding: 0 15px 15px 15px;
  width: 100%;
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

export const Version = styled.div`
  font-size: 12px; 
  padding-top: 7px;
  text-align: center;
`
