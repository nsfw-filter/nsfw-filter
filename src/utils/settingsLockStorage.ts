import {
  createSettingsPassword,
  isStoredSettingsPassword,
  normalizePassword,
  StoredSettingsPassword,
  verifySettingsPassword
} from './settingsPassword'

// Keep credentials out of Redux's full-state snapshots: an unrelated settings
// write from another page must never replace the password or retry counter.
export const SETTINGS_LOCK_KEY = 'nsfw-filter-settings-lock'
const MAX_UNLOCK_ATTEMPTS = 5
const UNLOCK_COOLDOWN_MS = 15_000

export type SettingsLockState = {
  password: StoredSettingsPassword | null
  failures: number
  blockedUntil: number
}

export type SettingsLockOperation =
  | { type: 'unlock', current: string }
  | { type: 'set', current: string, password: string }
  | { type: 'remove', current: string }

export const samePassword = (
  left: StoredSettingsPassword | null,
  right: StoredSettingsPassword | null
): boolean => {
  if (left === null || right === null) return left === right
  return left.hash.toLowerCase() === right.hash.toLowerCase()
    && left.salt.toLowerCase() === right.salt.toLowerCase()
    && left.iterations === right.iterations
}

export const parseSettingsLock = (value: unknown): SettingsLockState => {
  if (value === undefined) return { password: null, failures: 0, blockedUntil: 0 }
  if (value !== null && typeof value === 'object') {
    const state = value as Partial<SettingsLockState>
    if ((state.password === null || isStoredSettingsPassword(state.password))
      && typeof state.failures === 'number'
      && Number.isInteger(state.failures)
      && state.failures >= 0 && state.failures < MAX_UNLOCK_ATTEMPTS
      && typeof state.blockedUntil === 'number'
      && Number.isSafeInteger(state.blockedUntil) && state.blockedUntil >= 0) {
      return { password: state.password, failures: state.failures, blockedUntil: state.blockedUntil }
    }
  }
  // A damaged record is not evidence that the user removed their password.
  throw new Error('Invalid settings lock data')
}

const readSettingsLock = async (): Promise<SettingsLockState> => {
  const legacyKey = 'nsfw-filter-redux-storage'
  const data = await chrome.storage.local.get([SETTINGS_LOCK_KEY, legacyKey])
  if (data[SETTINGS_LOCK_KEY] === undefined) {
    // Migrate the previous storage format once. An explicit null after removal
    // prevents an old Redux snapshot from restoring the password.
    const legacy = data[legacyKey]
    const legacyState: { settings?: { settingsPassword?: unknown } } | undefined = (
      Array.isArray(legacy) ? legacy[2] : undefined
    )
    const password = legacyState?.settings?.settingsPassword
    if (password !== undefined && password !== null) {
      const migrated = parseSettingsLock({ password, failures: 0, blockedUntil: 0 })
      await saveSettingsLock(migrated)
      return migrated
    }
  }
  return parseSettingsLock(data[SETTINGS_LOCK_KEY])
}

export const loadSettingsLock = (): Promise<SettingsLockState> => (
  navigator.locks.request(SETTINGS_LOCK_KEY, readSettingsLock)
)

const saveSettingsLock = async (state: SettingsLockState): Promise<void> => {
  await chrome.storage.local.set({ [SETTINGS_LOCK_KEY]: state })
}

const cooldownMessage = (blockedUntil: number): string => {
  const seconds = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000))
  return `Too many attempts. Try again in ${seconds}s`
}

// The browser serializes this entire read/verify/write across popup and options
// pages. A queued operation must still match the credential its form displayed.
export const runSettingsLockOperation = async (
  expectedPassword: StoredSettingsPassword | null,
  operation: SettingsLockOperation
): Promise<{ password: StoredSettingsPassword | null, error: string | null }> => {
  return navigator.locks.request(SETTINGS_LOCK_KEY, async () => {
    const state = await readSettingsLock()
    const failure = (error: string) => ({ password: state.password, error })
    if (!samePassword(state.password, expectedPassword)) {
      return failure('The password changed in another page. Try again.')
    }
    if (state.blockedUntil > Date.now()) return failure(cooldownMessage(state.blockedUntil))

    if (state.password !== null) {
      if (normalizePassword(operation.current) === '') return failure('Enter the current password')
      if (!await verifySettingsPassword(operation.current, state.password)) {
        const failures = state.failures + 1
        const blocked = failures >= MAX_UNLOCK_ATTEMPTS
        const blockedUntil = blocked ? Date.now() + UNLOCK_COOLDOWN_MS : 0
        await saveSettingsLock({
          ...state,
          failures: blocked ? 0 : failures,
          blockedUntil
        })
        return failure(blocked ? cooldownMessage(blockedUntil) : 'Wrong password')
      }
    }

    let password = state.password
    if (operation.type === 'set') password = await createSettingsPassword(operation.password)
    if (operation.type === 'remove') password = null
    if (operation.type !== 'unlock' || state.failures !== 0 || state.blockedUntil !== 0) {
      await saveSettingsLock({ password, failures: 0, blockedUntil: 0 })
    }
    return { password, error: null }
  })
}
