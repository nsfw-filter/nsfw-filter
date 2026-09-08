import { Button, Input } from 'antd'
import { Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { UnlockForm, useSettingsLock } from '../../popup/components/SettingsLock'
import { setWebsiteList } from '../../popup/redux/actions/settings'
import { RootState } from '../../popup/redux/reducers'
import { SettingsState } from '../../popup/redux/reducers/settings'
import { isHostAllowed, normalizeHostEntry } from '../../utils/allowlist'

import { Wrap, Title, Sub, LockWrap, AddRow, ListCard, Row, Host, Remove, EmptyNote } from './styles'

export const Options: React.FC = () => {
  const dispatch = useDispatch()
  const lock = useSettingsLock()
  const { websites } = useSelector<RootState>((state) => state.settings) as SettingsState
  const [draft, setDraft] = useState('')

  const add = (event: React.FormEvent): void => {
    event.preventDefault()
    if (lock.isLocked) return
    const entry = normalizeHostEntry(draft)
    if (entry === '') return
    // isHostAllowed, not includes: a broader entry already covers a subdomain.
    if (!isHostAllowed(entry, websites)) dispatch(setWebsiteList([...websites, entry]))
    setDraft('')
  }

  const remove = (entry: string): void => {
    if (lock.isLocked) return
    dispatch(setWebsiteList(websites.filter(site => site !== entry)))
  }

  return (
    <Wrap>
      <Title>Allowed sites</Title>
      <Sub>
        NSFW Filter leaves these sites unfiltered. A domain also covers its
        subdomains, so allowing example.com covers www.example.com. You can also
        allow the current site in one click from the toolbar popup.
      </Sub>

      {lock.isLocked && (
        <LockWrap>
          <UnlockForm lock={lock} />
        </LockWrap>
      )}
      {lock.hasPassword && !lock.isLocked && (
        <LockWrap>
          <Button onClick={lock.lock} disabled={lock.busy}>Lock now</Button>
        </LockWrap>
      )}

      <AddRow onSubmit={add}>
        <Input
          placeholder="example.com"
          value={draft}
          disabled={lock.isLocked}
          onChange={event => setDraft(event.target.value)}
        />
        <Button type="primary" htmlType="submit" disabled={lock.isLocked}>Add</Button>
      </AddRow>

      <ListCard>
        {websites.length === 0
          ? <EmptyNote>No allowed sites yet. Every site is filtered.</EmptyNote>
          : websites.map(entry => (
            <Row key={entry}>
              <Host>{entry}</Host>
              <Remove
                onClick={() => remove(entry)}
                disabled={lock.isLocked}
                aria-label={`Remove ${entry}`}
              >
                <Trash2 size={16} />
              </Remove>
            </Row>
          ))}
      </ListCard>
    </Wrap>
  )
}
