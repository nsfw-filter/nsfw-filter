import { Button, Input } from 'antd'
import { Lock } from 'lucide-react'
import React, { useState } from 'react'

import { MIN_PASSWORD_LENGTH, normalizePassword } from '../../../utils/settingsPassword'

import {
  LockActions,
  LockCard,
  LockError,
  LockFields,
  LockForm,
  LockHint,
  LockLabel,
  LockRow,
  LockTextButton,
  LockTitle
} from './styles'
import { SettingsLock } from './useSettingsLock'

export { useSettingsLock } from './useSettingsLock'
export type { SettingsLock } from './useSettingsLock'

export const UnlockForm: React.FC<{ lock: SettingsLock }> = ({ lock }) => {
  const [password, setPassword] = useState('')
  const empty = normalizePassword(password) === ''

  const submit = async (): Promise<void> => {
    if (lock.busy || empty) return
    if (await lock.unlock(password)) setPassword('')
  }

  return (
    <LockCard
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
    >
      <LockTitle>
        <Lock size={14} aria-hidden="true" />
        Settings locked
      </LockTitle>
      <LockHint>Enter the password to change filter settings.</LockHint>
      <LockFields>
        <Input.Password
          size="small"
          placeholder="Password or PIN"
          value={password}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          onChange={event => {
            setPassword(event.target.value)
            if (lock.error !== '') lock.clearError()
          }}
          disabled={lock.busy}
        />
        {lock.error !== '' && <LockError role="alert">{lock.error}</LockError>}
        <Button
          type="primary"
          htmlType="submit"
          size="small"
          loading={lock.busy}
          disabled={empty}
        >
          Unlock
        </Button>
      </LockFields>
    </LockCard>
  )
}

export const SettingsLockControls: React.FC<{ lock: SettingsLock }> = ({ lock }) => {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  const close = (): void => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setEditing(false)
    lock.clearError()
  }

  const save = async (): Promise<void> => {
    const ok = await lock.setPassword({ password: next, confirm, current })
    if (ok) close()
  }

  const remove = async (): Promise<void> => {
    if (await lock.removePassword(current)) close()
  }

  return (
    <>
      <LockRow>
        <LockLabel>Settings lock</LockLabel>
        {lock.hasPassword
          ? <Button size="small" htmlType="button" onClick={lock.lock}>Lock now</Button>
          : (
            <Button size="small" htmlType="button" onClick={() => editing ? close() : setEditing(true)}>
              {editing ? 'Cancel' : 'Set password'}
            </Button>
            )}
      </LockRow>
      {lock.hasPassword && (
        <LockTextButton type="button" onClick={() => editing ? close() : setEditing(true)}>
          {editing ? 'Cancel' : 'Change or remove'}
        </LockTextButton>
      )}
      {editing && (
        <LockForm
          onSubmit={event => {
            event.preventDefault()
            void save()
          }}
        >
          <LockHint>
            {lock.hasPassword
              ? 'Current password is required to change or remove the lock.'
              : `Optional. ${MIN_PASSWORD_LENGTH}+ characters. Closing the popup locks again.`}
          </LockHint>
          {lock.hasPassword && (
            <Input.Password
              size="small"
              placeholder="Current password"
              value={current}
              autoComplete="off"
              spellCheck={false}
              onChange={event => setCurrent(event.target.value)}
              disabled={lock.busy}
            />
          )}
          <Input.Password
            size="small"
            placeholder={lock.hasPassword ? 'New password or PIN' : 'Password or PIN'}
            value={next}
            autoComplete="new-password"
            spellCheck={false}
            onChange={event => setNext(event.target.value)}
            disabled={lock.busy}
          />
          <Input.Password
            size="small"
            placeholder="Confirm"
            value={confirm}
            autoComplete="new-password"
            spellCheck={false}
            onChange={event => setConfirm(event.target.value)}
            disabled={lock.busy}
          />
          {lock.error !== '' && <LockError role="alert">{lock.error}</LockError>}
          <LockActions>
            <Button type="primary" htmlType="submit" size="small" loading={lock.busy}>
              {lock.hasPassword ? 'Change password' : 'Save password'}
            </Button>
            {lock.hasPassword && (
              <Button size="small" danger htmlType="button" onClick={() => { void remove() }} disabled={lock.busy}>
                Remove lock
              </Button>
            )}
          </LockActions>
        </LockForm>
      )}
    </>
  )
}
