import { Switch } from 'antd/lib'
import 'antd/lib/switch/style/index.css'
import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 15px 10px 15px;
  width: 100%;
`

export const Stats = styled.div`
  cursor: default;
  padding-bottom: 15px;
  text-align: center;
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

export const StyledSwitch = styled(Switch)`
  color: ${props => props.theme.text.primary};
`

export const SwitchContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 7px 0;
  width: 100%;
`

export const Label = styled.div`
  margin-right: 10px;
`
