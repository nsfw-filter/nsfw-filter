import BugOutlined from '@ant-design/icons/lib/icons/BugOutlined'
import DollarOutlined from '@ant-design/icons/lib/icons/DollarOutlined'
import HeartOutlined from '@ant-design/icons/lib/icons/HeartOutlined'
import { SettingsState } from 'popup/redux/reducers/settings'
import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  toggleLogging
} from '../../redux/actions/settings/index'
import { RootState } from '../../redux/reducers'

import { Container, CheckboxArea, BugReport, Sponsor, OlostepTip, StyledCheckbox, Version } from './styles'

export const Footer: React.FC = () => {
  const dispatch = useDispatch()
  const [version, setVersion] = useState('')

  const {
    logging
  } = useSelector<RootState>((state) => state.settings) as SettingsState

  useEffect(() => {
    const manifestData = chrome.runtime.getManifest()
    setVersion(manifestData.version)
  }, [])

  const sendDonationRequest = (): void => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      chrome.tabs.sendMessage(activeTab.id as number, { message: 'request-donation' })
      window.close()
    })
  }

  return (
    <Container>
      <CheckboxArea>
        <StyledCheckbox
          checked={logging}
          onChange={() => dispatch(toggleLogging())}
        >{'Show logs in browser console'}</StyledCheckbox>
      </CheckboxArea>

      <BugReport>
        <BugOutlined />
        <span><a rel="noreferrer" target="_blank" href="https://github.com/nsfw-filter/nsfw-filter/issues">Report a bug</a></span>
        <BugOutlined />
      </BugReport>

      <Sponsor>
        <DollarOutlined />
        <span><a rel="noreferrer" target="_blank" href="https://www.patreon.com/nsfwfilter">Sponsor on Patreon</a></span>
        <DollarOutlined />
      </Sponsor>

      <OlostepTip>
        <HeartOutlined />
        <span onClick={sendDonationRequest}><a>Support with a Donation</a></span>
        <HeartOutlined />
      </OlostepTip>

      <Version>v{version}</Version>
    </Container>
  )
}
