import { useEffect, useRef, useState } from 'react'

import {
  loadSettingsLock,
  parseSettingsLock,
  runSettingsLockOperation,
  samePassword,
  SETTINGS_LOCK_KEY,
  SettingsLockOperation,
  SettingsLockState
} from '../../../utils/settingsLockStorage'
import { normalizePassword, passwordLengthError, StoredSettingsPassword } from '../../../utils/settingsPassword'

export type SettingsLock = {
  ready: boolean
  hasPassword: boolean
  isLocked: boolean
  busy: boolean
  error: string
  reload: () => void
  unlock: (password: string) => Promise<boolean>
  lock: () => void
  clearError: () => void
  setPassword: (input: { password: string, confirm: string, current?: string }) => Promise<boolean>
  removePassword: (current: string) => Promise<boolean>
}

export const useSettingsLock = (): SettingsLock => {
  const [state, setState] = useState<SettingsLockState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  // Authorization belongs to this page and the exact credential it verified.
  const [unlockedPassword, setUnlockedPassword] = useState<StoredSettingsPassword | null>(null)

  useEffect(() => {
    let active = true
    let changed = false
    const failed = (): void => {
      setState(null)
      setUnlockedPassword(null)
      setLoadError('Unable to load the settings lock. Try again.')
    }
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      if (area !== 'local' || !(SETTINGS_LOCK_KEY in changes)) return
      changed = true
      try {
        setState(parseSettingsLock(changes[SETTINGS_LOCK_KEY].newValue))
        setLoadError('')
      } catch {
        failed()
      }
    }
    chrome.storage.onChanged.addListener(onChanged)
    void loadSettingsLock().then(loaded => {
      // A storage event received during loading is newer than the initial read.
      if (active && !changed) {
        setState(loaded)
        setLoadError('')
      }
    }).catch(() => {
      if (active && !changed) failed()
    })
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [reloadVersion])

  const run = async (operation: SettingsLockOperation): Promise<boolean> => {
    if (busyRef.current || state === null) return false
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await runSettingsLockOperation(state.password, operation)
      if (result.error !== null) {
        setError(result.error)
        return false
      }
      setUnlockedPassword(result.password)
      return true
    } catch {
      setError('Something went wrong. Try again.')
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
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
    return run({ type: 'set', current, password })
  }

  const hasPassword = state !== null && state.password !== null
  return {
    ready: state !== null,
    hasPassword,
    isLocked: state === null || (hasPassword && !samePassword(state.password, unlockedPassword)),
    busy,
    error: loadError || error,
    reload: () => {
      setLoadError('')
      setReloadVersion(value => value + 1)
    },
    unlock: current => run({ type: 'unlock', current }),
    lock: () => {
      if (busyRef.current) return
      setUnlockedPassword(null)
      setError('')
    },
    clearError: () => setError(''),
    setPassword,
    removePassword: current => run({ type: 'remove', current })
  }
}
