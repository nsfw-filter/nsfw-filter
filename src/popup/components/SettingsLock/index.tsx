import { Button, Input } from 'antd'
import React, { useState } from 'react'

import { MIN_PASSWORD_LENGTH } from '../../../utils/settingsPassword'
import { useSettingsLock } from '../../hooks/useSettingsLock'
import { AdvancedRow, FieldLabel } from '../Production/styles'

import { LockActions, LockCard, LockError, LockFields, LockHint, LockTitle } from './styles'

type LockApi = ReturnType<typeof useSettingsLock>

type UnlockFormProps = {
  lock: LockApi
}

export const UnlockForm: React.FC<UnlockFormProps> = ({ lock }) => {
  const [password, setPassword] = useState('')

  const submit = async (): Promise<void> => {
    const ok = await lock.unlock(password)
    if (ok) setPassword('')
  }

  return (
    <LockCard>
      <LockTitle>Settings locked</LockTitle>
      <LockHint>
        Enter the password to change protection, strictness, the model, or allowed sites.
      </LockHint>
      <LockFields>
        <Input.Password
          size="small"
          placeholder="Password or PIN"
          value={password}
          onChange={event => setPassword(event.target.value)}
          onPressEnter={() => { void submit() }}
          disabled={lock.busy}
        />
        {lock.error !== '' && <LockError>{lock.error}</LockError>}
        <Button type="primary" size="small" onClick={() => { void submit() }} loading={lock.busy}>
          Unlock
        </Button>
      </LockFields>
    </LockCard>
  )
}

type SettingsLockControlsProps = {
  lock: LockApi
}

export const SettingsLockControls: React.FC<SettingsLockControlsProps> = ({ lock }) => {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  const reset = (): void => {
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  const save = async (): Promise<void> => {
    const ok = await lock.setPassword(next, confirm, current)
    if (ok) {
      reset()
      setOpen(false)
    }
  }

  const remove = async (): Promise<void> => {
    const ok = await lock.removePassword(current)
    if (ok) {
      reset()
      setOpen(false)
    }
  }

  return (
    <>
      <AdvancedRow>
        <FieldLabel>Settings lock</FieldLabel>
        {lock.hasPassword
          ? (
            <Button size="small" onClick={lock.lock}>
              Lock now
            </Button>
            )
          : (
            <Button size="small" onClick={() => setOpen(value => !value)}>
              {open ? 'Cancel' : 'Set password'}
            </Button>
            )}
      </AdvancedRow>
      {lock.hasPassword && (
        <Button size="small" onClick={() => setOpen(value => !value)}>
          {open ? 'Cancel' : 'Change or remove'}
        </Button>
      )}
      {open && (
        <LockFields>
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
              onChange={event => setCurrent(event.target.value)}
              disabled={lock.busy}
            />
          )}
          <Input.Password
            size="small"
            placeholder={lock.hasPassword ? 'New password or PIN' : 'Password or PIN'}
            value={next}
            onChange={event => setNext(event.target.value)}
            disabled={lock.busy}
          />
          <Input.Password
            size="small"
            placeholder="Confirm"
            value={confirm}
            onChange={event => setConfirm(event.target.value)}
            onPressEnter={() => { void save() }}
            disabled={lock.busy}
          />
          {lock.error !== '' && <LockError>{lock.error}</LockError>}
          <LockActions>
            <Button type="primary" size="small" onClick={() => { void save() }} loading={lock.busy}>
              {lock.hasPassword ? 'Change password' : 'Save password'}
            </Button>
            {lock.hasPassword && (
              <Button size="small" danger onClick={() => { void remove() }} disabled={lock.busy}>
                Remove lock
              </Button>
            )}
          </LockActions>
        </LockFields>
      )}
    </>
  )
}
