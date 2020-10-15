import BugOutlined from '@ant-design/icons/lib/icons/BugOutlined'
import Select from 'antd/lib/select'
import { SettingsState } from 'popup/redux/reducers/settings'
import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  toggleLogging,
  toggleDivFiltering,
  setTrainedModel,
  setFilterEffect,
  setConcurrency
} from '../../redux/actions/settings/index'
import { RootState } from '../../redux/reducers'

import { Container, CheckboxArea, DropdownRow, TestersTitle, BugReport, StyledCheckbox, Footer } from './styles'

const { Option } = Select

export const Testing: React.FC = () => {
  const dispatch = useDispatch()
  const [version, setVersion] = useState('')

  const {
    logging,
    filteringDiv,
    trainedModel,
    filterEffect,
    concurrency
  } = useSelector<RootState>((state) => state.settings) as SettingsState

  useEffect(() => {
    const manifestData = chrome.runtime.getManifest()
    setVersion(manifestData.version)
  }, [])

  return (
    <Container>

      <TestersTitle>Upcoming Features</TestersTitle>

      <DropdownRow>
        <span>Filter effect</span>
        <Select
          defaultValue={filterEffect}
          style={{ width: 120 }}
          onChange={value => dispatch(setFilterEffect(value))}
        >
          <Option value="hide">Hide</Option>
          <Option value="blur">Blur</Option>
        </Select>
      </DropdownRow>

      <DropdownRow>
        <span>Trained model</span>
        <Select
          defaultValue={trainedModel}
          style={{ width: 120 }}
          onChange={value => dispatch(setTrainedModel(value))}
        >
          <Option value={trainedModel}>Mobile v1.0</Option>
        </Select>
      </DropdownRow>

      <DropdownRow>
        <span>Concurrency</span>
        <Select
          defaultValue={concurrency}
          style={{ width: 120 }}
          onChange={value => dispatch(setConcurrency(value))}
        >
          <Option value="1">1</Option>
          <Option value="2">2</Option>
          <Option value="3">3</Option>
        </Select>
      </DropdownRow>

      <CheckboxArea>
        <StyledCheckbox
          checked={logging}
          onChange={() => dispatch(toggleLogging())}
        >{'Show logs in browser console'}</StyledCheckbox>

        <StyledCheckbox
          checked={filteringDiv}
          style={{ marginLeft: 0, paddingTop: '7px' }}
          onChange={() => dispatch(toggleDivFiltering())}
        >{'Filter backgroundImage of <div> tag'}</StyledCheckbox>

        {/* <StyledCheckbox
          checked={filteringGif}
          style={{ marginLeft: 0, paddingTop: '7px' }}
          onChange={() => dispatch(toggleGifFiltering())}
        >{'Filter GIF images'}</StyledCheckbox> */}
      </CheckboxArea>

      <BugReport>
        <BugOutlined />
        <span>Please send a bug report <a rel="noreferrer" target="_blank" href="https://github.com/nsfw-filter/nsfw-filter/issues">here</a></span>
        <BugOutlined />
      </BugReport>

      <Footer>v{version}</Footer>
    </Container>
  )
}
