import { Button, Input } from 'antd'
import { Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { setWebsiteList } from '../../popup/redux/actions/settings/index'
import { RootState } from '../../popup/redux/reducers'
import { SettingsState } from '../../popup/redux/reducers/settings'
import { isHostAllowed, normalizeHostEntry } from '../../utils/allowlist'

import { Wrap, Title, Sub, AddRow, ListCard, Row, Host, Remove, EmptyNote } from './styles'

export const Options: React.FC = () => {
  const dispatch = useDispatch()
  const { websites } = useSelector<RootState>((state) => state.settings) as SettingsState
  const [draft, setDraft] = useState('')

  const add = (event: React.FormEvent): void => {
    event.preventDefault()
    const entry = normalizeHostEntry(draft)
    if (entry === '') return
    // isHostAllowed, not includes: a broader entry already covers a subdomain.
    if (!isHostAllowed(entry, websites)) dispatch(setWebsiteList([...websites, entry]))
    setDraft('')
  }

  const remove = (entry: string): void => {
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

      <AddRow onSubmit={add}>
        <Input
          placeholder="example.com"
          value={draft}
          onChange={event => setDraft(event.target.value)}
        />
        <Button type="primary" htmlType="submit">Add</Button>
      </AddRow>

      <ListCard>
        {websites.length === 0
          ? <EmptyNote>No allowed sites yet. Every site is filtered.</EmptyNote>
          : websites.map(entry => (
            <Row key={entry}>
              <Host>{entry}</Host>
              <Remove onClick={() => remove(entry)} aria-label={`Remove ${entry}`}>
                <Trash2 size={16} />
              </Remove>
            </Row>
          ))}
      </ListCard>
    </Wrap>
  )
}
