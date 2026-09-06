import { Button, Input } from 'antd'
import { Lock, TriangleAlert } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { normalizePassword } from '../../../utils/settingsPassword'

import {
  LockActions,
  LockCard,
  LockError,
  LockField,
  LockFields,
  LockForm,
  LockHint,
  LockLabel,
  LockLink,
  LockRow,
  LockTitle,
  LockWarning
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

  if (!lock.ready) {
    return (
      <LockCard as="div">
        <LockTitle>Settings locked</LockTitle>
        {lock.error === ''
          ? <LockHint>Loading settings lock…</LockHint>
          : (
            <>
              <LockError role="alert">{lock.error}</LockError>
              <Button size="small" onClick={lock.reload}>Try again</Button>
            </>
            )}
      </LockCard>
    )
  }

  return (
    <LockCard
      as="form"
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
          placeholder="Password or PIN"
          aria-label="Password or PIN"
          value={password}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          onChange={event => {
            setPassword(event.target.value)
            if (lock.error !== '') lock.clearError()
          }}
          readOnly={lock.busy}
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
  const [policyProtected, setPolicyProtected] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        // getSelf needs no extra permission; policy-installed can still mean removable.
        const info = await chrome.management.getSelf()
        if (active) setPolicyProtected(info.installType === 'admin' && info.mayDisable === false)
      } catch {
        // Keep the warning when the browser cannot confirm protection.
      }
    })()
    return () => { active = false }
  }, [])

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
    <LockCard as="div">
      <LockRow>
        <LockLabel>Settings lock</LockLabel>
        {lock.hasPassword
          ? <Button size="small" htmlType="button" disabled={lock.busy} onClick={lock.lock}>Lock now</Button>
          : (
            <Button
              size="small"
              htmlType="button"
              disabled={lock.busy}
              onClick={() => editing ? close() : setEditing(true)}
            >
              {editing ? 'Cancel' : 'Set password'}
            </Button>
            )}
      </LockRow>
      {lock.hasPassword && (
        <LockLink
          type="button"
          disabled={lock.busy}
          onClick={() => editing ? close() : setEditing(true)}
        >
          {editing ? 'Cancel' : 'Change or remove'}
        </LockLink>
      )}
      {(editing || lock.hasPassword) && !policyProtected && (
        <LockWarning role="note">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>
            A password alone won’t prevent disabling or removing this extension.{' '}
            <LockLink
              as="a"
              href={chrome.runtime.getURL('src/browser-policy.html')}
              target="_blank"
              rel="noopener noreferrer"
            >
              Browser policy setup
            </LockLink>
          </span>
        </LockWarning>
      )}
      {editing && (
        <LockForm
          onSubmit={event => {
            event.preventDefault()
            void save()
          }}
        >
          {lock.hasPassword && (
            <LockHint>Current password is required to change or remove the lock.</LockHint>
          )}
          {lock.hasPassword && (
            <LockField>
              <LockLabel>Current password</LockLabel>
              <Input.Password
                placeholder="Current password"
                aria-label="Current password"
                value={current}
                autoComplete="off"
                spellCheck={false}
                onChange={event => setCurrent(event.target.value)}
                readOnly={lock.busy}
              />
            </LockField>
          )}
          <LockField>
            <LockLabel>{lock.hasPassword ? 'New password or PIN' : 'Password or PIN'}</LockLabel>
            <Input.Password
              placeholder={lock.hasPassword ? 'New password or PIN' : 'Password or PIN'}
              aria-label={lock.hasPassword ? 'New password or PIN' : 'Password or PIN'}
              value={next}
              autoComplete="new-password"
              spellCheck={false}
              onChange={event => setNext(event.target.value)}
              readOnly={lock.busy}
            />
          </LockField>
          <LockField>
            <LockLabel>Confirm password</LockLabel>
            <Input.Password
              placeholder="Confirm"
              aria-label="Confirm password"
              value={confirm}
              autoComplete="new-password"
              spellCheck={false}
              onChange={event => setConfirm(event.target.value)}
              readOnly={lock.busy}
            />
          </LockField>
          {lock.error !== '' && <LockError role="alert">{lock.error}</LockError>}
          <LockActions>
            <Button type="primary" htmlType="submit" size="small" loading={lock.busy}>
              {lock.hasPassword ? 'Change password' : 'Save password'}
            </Button>
            {lock.hasPassword && (
              <Button
                size="small"
                danger
                htmlType="button"
                onClick={() => { void remove() }}
                disabled={lock.busy}
              >
                Remove lock
              </Button>
            )}
          </LockActions>
        </LockForm>
      )}
    </LockCard>
  )
}
