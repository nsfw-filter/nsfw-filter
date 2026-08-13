import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  createSettingsPassword,
  isStoredSettingsPassword,
  MAX_UNLOCK_ATTEMPTS,
  normalizePassword,
  passwordLengthError,
  UNLOCK_COOLDOWN_MS,
  verifySettingsPassword
} from '../../../utils/settingsPassword'
import { clearSettingsPassword, setSettingsPassword } from '../../redux/actions/settings'
import { RootState } from '../../redux/reducers'
import { SettingsState } from '../../redux/reducers/settings'

export type SettingsLock = {
  hasPassword: boolean
  isLocked: boolean
  busy: boolean
  error: string
  unlock: (password: string) => Promise<boolean>
  lock: () => void
  clearError: () => void
  setPassword: (input: { password: string, confirm: string, current?: string }) => Promise<boolean>
  removePassword: (current: string) => Promise<boolean>
}

// Session-only UI lock. The reducer still applies settings writes; closing
// this page forgets `unlocked`. A careful user can still edit chrome.storage.
export const useSettingsLock = (): SettingsLock => {
  const dispatch = useDispatch()
  const { settingsPassword } = useSelector<RootState>((state) => state.settings) as SettingsState
  const hasPassword = isStoredSettingsPassword(settingsPassword)

  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [failures, setFailures] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState(0)

  const fail = (): string => {
    const next = failures + 1
    if (next >= MAX_UNLOCK_ATTEMPTS) {
      setFailures(0)
      setBlockedUntil(Date.now() + UNLOCK_COOLDOWN_MS)
      return `Too many attempts. Try again in ${UNLOCK_COOLDOWN_MS / 1000}s`
    }
    setFailures(next)
    return 'Wrong password'
  }

  const run = async (work: () => Promise<string | null>): Promise<boolean> => {
    if (busyRef.current) return false
    const waitMs = blockedUntil - Date.now()
    if (waitMs > 0) {
      setError(`Too many attempts. Try again in ${Math.max(1, Math.ceil(waitMs / 1000))}s`)
      return false
    }

    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const message = await work()
      if (message !== null) {
        setError(message)
        return false
      }
      setFailures(0)
      return true
    } catch {
      setError('Something went wrong. Try again.')
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const unlock = async (password: string): Promise<boolean> => {
    if (!hasPassword) return true
    const ok = await run(async () => (
      await verifySettingsPassword(password, settingsPassword) ? null : fail()
    ))
    if (ok) setUnlocked(true)
    return ok
  }

  const setPassword = async ({ password, confirm, current = '' }: {
    password: string
    confirm: string
    current?: string
  }): Promise<boolean> => {
    const lengthError = passwordLengthError(password)
    if (lengthError !== null) {
      setError(lengthError)
      return false
    }
    if (normalizePassword(password) !== normalizePassword(confirm)) {
      setError('Passwords do not match')
      return false
    }

    const ok = await run(async () => {
      if (hasPassword) {
        if (normalizePassword(current) === '') return 'Enter the current password'
        if (!await verifySettingsPassword(current, settingsPassword)) return fail()
      }
      dispatch(setSettingsPassword(await createSettingsPassword(password)))
      return null
    })
    if (ok) setUnlocked(true)
    return ok
  }

  const removePassword = async (current: string): Promise<boolean> => {
    if (!hasPassword) {
      dispatch(clearSettingsPassword())
      return true
    }
    const ok = await run(async () => {
      if (normalizePassword(current) === '') return 'Enter the current password'
      if (!await verifySettingsPassword(current, settingsPassword)) return fail()
      dispatch(clearSettingsPassword())
      return null
    })
    if (ok) setUnlocked(false)
    return ok
  }

  return {
    hasPassword,
    isLocked: hasPassword && !unlocked,
    busy,
    error,
    unlock,
    lock: () => {
      setUnlocked(false)
      setError('')
    },
    clearError: () => setError(''),
    setPassword,
    removePassword
  }
}
