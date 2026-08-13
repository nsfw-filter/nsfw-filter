// Optional popup/options lock. The hash lives in chrome.storage with the rest
// of the redux state; the plaintext never does. Closing the popup re-locks
// because unlock is React state only. This cannot stop uninstall — use a
// browser policy for that.

export const MIN_PASSWORD_LENGTH = 4
export const MAX_PASSWORD_LENGTH = 128
export const DEFAULT_ITERATIONS = 120_000
export const MAX_ITERATIONS = 400_000
export const SALT_BYTES = 16
export const HASH_HEX_LENGTH = 64
export const SALT_HEX_LENGTH = SALT_BYTES * 2
export const MAX_UNLOCK_ATTEMPTS = 5
export const UNLOCK_COOLDOWN_MS = 15_000

export type StoredSettingsPassword = {
  hash: string
  salt: string
  iterations: number
}

const isHex = (value: string, length: number): boolean =>
  value.length === length && /^[0-9a-fA-F]+$/.test(value)

export const isStoredSettingsPassword = (value: unknown): value is StoredSettingsPassword => {
  if (value === null || typeof value !== 'object') return false
  const record = value as Partial<StoredSettingsPassword>
  return typeof record.hash === 'string'
    && isHex(record.hash, HASH_HEX_LENGTH)
    && typeof record.salt === 'string'
    && isHex(record.salt, SALT_HEX_LENGTH)
    && typeof record.iterations === 'number'
    && Number.isInteger(record.iterations)
    && record.iterations > 0
    && record.iterations <= MAX_ITERATIONS
}

// Trim so leading/trailing spaces are not a second password, and so a
// field of only spaces cannot satisfy the length check.
export const normalizePassword = (password: string): string => password.normalize('NFKC').trim()

export const passwordLengthError = (password: string): string | null => {
  const length = normalizePassword(password).length
  if (length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters`
  if (length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters`
  return null
}

const toHex = (bytes: Uint8Array): string => {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('Invalid hex')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

const timingSafeEqualHex = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let i = 0; i < left.length; i++) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return mismatch === 0
}

// Copy into a real ArrayBuffer. Uint8Array.buffer is ArrayBufferLike, which
// Web Crypto's BufferSource type rejects under this tsconfig.
const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

const derive = async (password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
  if (iterations < 1 || iterations > MAX_ITERATIONS) throw new Error('Invalid iteration count')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizePassword(password)),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    key,
    256
  )
  return new Uint8Array(bits)
}

export const createSettingsPassword = async (password: string): Promise<StoredSettingsPassword> => {
  const lengthError = passwordLengthError(password)
  if (lengthError !== null) throw new Error(lengthError)
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, DEFAULT_ITERATIONS)
  return { hash: toHex(hash), salt: toHex(salt), iterations: DEFAULT_ITERATIONS }
}

export const verifySettingsPassword = async (
  password: string,
  stored: StoredSettingsPassword
): Promise<boolean> => {
  if (!isStoredSettingsPassword(stored)) return false
  try {
    const derived = await derive(password, fromHex(stored.salt), stored.iterations)
    return timingSafeEqualHex(toHex(derived), stored.hash.toLowerCase())
  } catch {
    return false
  }
}
