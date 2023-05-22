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

export const TooltipText = styled.div`
  cursor: pointer;
  margin-right: 10px;
`
export const TooltipBox = styled.div`
  background-color: transparent;
  border-radius: 4px;
  color: transparent;
  left: 30px;
  padding: 5px 5px;
  position: absolute;
  top: calc(100% + 10px);
  transition: visibility 0.5s, color 0.5s, background-color 0.5s, width 0.5s,
    padding 0.5s ease-in-out;
  visibility: hidden;
  width: 150px;
  &:before {
    border: 10px solid transparent;
    content: "";
    height: 0;
    left: 40px;
    position: absolute;
    top: -10px;
    transform: rotate(135deg);
    transition: border 0.3s ease-in-out;
    width: 0;
  }
`

export const TooltipCard = styled.div`
  position: relative;
  & ${TooltipText}:hover + ${TooltipBox} {
    background-color: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 8px 8px;
    visibility: visible;
    width: 230px;
    &:before {
      border-color: transparent transparent rgba(0, 0, 0, 0.8)
        rgba(0, 0, 0, 0.8);
    }
  }
`
