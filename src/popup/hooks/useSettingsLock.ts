import { useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  createSettingsPassword,
  isStoredSettingsPassword,
  MAX_UNLOCK_ATTEMPTS,
  passwordLengthError,
  UNLOCK_COOLDOWN_MS,
  verifySettingsPassword
} from '../../utils/settingsPassword'
import { clearSettingsPassword, setSettingsPassword } from '../redux/actions/settings'
import { RootState } from '../redux/reducers'
import { SettingsState } from '../redux/reducers/settings'

export const useSettingsLock = () => {
  const dispatch = useDispatch()
  const settingsPassword = useSelector<RootState>(
    state => (state.settings as SettingsState).settingsPassword
  )
  const hasPassword = isStoredSettingsPassword(settingsPassword)
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [failures, setFailures] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState(0)

  const canEdit = !hasPassword || unlocked

  const blockedMessage = useCallback((): string | null => {
    const remaining = blockedUntil - Date.now()
    if (remaining <= 0) return null
    const seconds = Math.max(1, Math.ceil(remaining / 1000))
    return `Too many attempts. Try again in ${seconds}s`
  }, [blockedUntil])

  const registerFailure = useCallback((): string => {
    const next = failures + 1
    setFailures(next)
    if (next >= MAX_UNLOCK_ATTEMPTS) {
      setBlockedUntil(Date.now() + UNLOCK_COOLDOWN_MS)
      setFailures(0)
      return `Too many attempts. Try again in ${UNLOCK_COOLDOWN_MS / 1000}s`
    }
    return 'Wrong password'
  }, [failures])

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const blocked = blockedMessage()
    if (blocked !== null) {
      setError(blocked)
      return false
    }
    if (!hasPassword || settingsPassword === null) return true
    setBusy(true)
    setError('')
    try {
      const ok = await verifySettingsPassword(password, settingsPassword)
      if (!ok) {
        setError(registerFailure())
        return false
      }
      setFailures(0)
      setUnlocked(true)
      return true
    } finally {
      setBusy(false)
    }
  }, [blockedMessage, hasPassword, registerFailure, settingsPassword])

  const lock = useCallback((): void => {
    setUnlocked(false)
    setError('')
  }, [])

  const setPassword = useCallback(async (password: string, confirm: string, current = ''): Promise<boolean> => {
    const blocked = blockedMessage()
    if (blocked !== null) {
      setError(blocked)
      return false
    }
    const lengthError = passwordLengthError(password)
    if (lengthError !== null) {
      setError(lengthError)
      return false
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return false
    }
    setBusy(true)
    setError('')
    try {
      if (hasPassword && settingsPassword !== null) {
        const ok = await verifySettingsPassword(current, settingsPassword)
        if (!ok) {
          setError(registerFailure())
          return false
        }
      }
      dispatch(setSettingsPassword(await createSettingsPassword(password)))
      setFailures(0)
      setUnlocked(true)
      return true
    } finally {
      setBusy(false)
    }
  }, [blockedMessage, dispatch, hasPassword, registerFailure, settingsPassword])

  const removePassword = useCallback(async (current: string): Promise<boolean> => {
    const blocked = blockedMessage()
    if (blocked !== null) {
      setError(blocked)
      return false
    }
    if (!hasPassword || settingsPassword === null) {
      dispatch(clearSettingsPassword())
      return true
    }
    setBusy(true)
    setError('')
    try {
      const ok = await verifySettingsPassword(current, settingsPassword)
      if (!ok) {
        setError(registerFailure())
        return false
      }
      dispatch(clearSettingsPassword())
      setFailures(0)
      setUnlocked(false)
      setError('')
      return true
    } finally {
      setBusy(false)
    }
  }, [blockedMessage, dispatch, hasPassword, registerFailure, settingsPassword])

  return { hasPassword, unlocked, canEdit, busy, error, unlock, lock, setPassword, removePassword }
}
