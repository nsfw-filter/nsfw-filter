import { Switch } from 'antd'
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { isHostAllowed, normalizeHostEntry } from '../../../utils/allowlist'
import { setWebsiteList } from '../../redux/actions/settings/index'
import { RootState } from '../../redux/reducers'
import { SettingsState } from '../../redux/reducers/settings'

import { AllowRow, AllowText, AllowHost, FieldLabel } from './styles'

// The active tab's host, or '' on a page with no filterable host (chrome://,
// the new-tab page, extension pages) where allow-listing makes no sense.
const useCurrentHost = (): string | null => {
  const [host, setHost] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (!active) return
        try {
          setHost(tab?.url ? new URL(tab.url).hostname : '')
        } catch {
          setHost('')
        }
      })
      .catch(() => { if (active) setHost('') })
    return () => { active = false }
  }, [])

  return host
}

export const AllowSiteField: React.FC = () => {
  const dispatch = useDispatch()
  const { websites } = useSelector<RootState>((state) => state.settings) as SettingsState
  const host = useCurrentHost()

  const allowed = host !== null && host !== '' && isHostAllowed(host, websites)

  const onToggle = (allow: boolean): void => {
    if (host === null || host === '') return
    if (allow) {
      const entry = normalizeHostEntry(host)
      if (entry !== '' && !websites.includes(entry)) dispatch(setWebsiteList([...websites, entry]))
    } else {
      // Drop every entry that currently covers this host, including a broader
      // parent-domain entry, so the toggle actually re-enables filtering here.
      dispatch(setWebsiteList(websites.filter(entry => !isHostAllowed(host, [entry]))))
    }
  }

  return (
    <AllowRow>
      <AllowText>
        <FieldLabel>Allow this site</FieldLabel>
        <AllowHost>{host === null ? '…' : host === '' ? 'Not available on this page' : host}</AllowHost>
      </AllowText>
      <Switch checked={allowed} disabled={host === null || host === ''} onChange={onToggle} />
    </AllowRow>
  )
}
