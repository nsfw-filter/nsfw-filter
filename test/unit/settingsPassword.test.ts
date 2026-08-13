import {
  createSettingsPassword,
  HASH_HEX_LENGTH,
  isStoredSettingsPassword,
  passwordLengthError,
  SALT_HEX_LENGTH,
  verifySettingsPassword
} from '../../src/utils/settingsPassword'

const validRecord = {
  hash: 'a'.repeat(HASH_HEX_LENGTH),
  salt: 'b'.repeat(SALT_HEX_LENGTH),
  iterations: 120000
}

describe('utils => settingsPassword', () => {
  test('createSettingsPassword hashes and verifySettingsPassword accepts the original', async () => {
    const stored = await createSettingsPassword('secret-1')
    expect(stored.hash).toHaveLength(HASH_HEX_LENGTH)
    expect(stored.salt).toHaveLength(SALT_HEX_LENGTH)
    expect(stored.hash).not.toContain('secret')
    await expect(verifySettingsPassword('secret-1', stored)).resolves.toBe(true)
  })

  test('treats surrounding spaces as the same password', async () => {
    const stored = await createSettingsPassword('  secret-1  ')
    await expect(verifySettingsPassword('secret-1', stored)).resolves.toBe(true)
    await expect(verifySettingsPassword('\tsecret-1\n', stored)).resolves.toBe(true)
  })

  test('rejects a wrong password', async () => {
    const stored = await createSettingsPassword('secret-1')
    await expect(verifySettingsPassword('secret-2', stored)).resolves.toBe(false)
  })

  test('two creates produce different salts and hashes', async () => {
    const first = await createSettingsPassword('same-password')
    const second = await createSettingsPassword('same-password')
    expect(first.salt).not.toBe(second.salt)
    expect(first.hash).not.toBe(second.hash)
  })

  test('passwordLengthError enforces a minimum length after trim', () => {
    expect(passwordLengthError('123')).not.toBeNull()
    expect(passwordLengthError('1234')).toBeNull()
    expect(passwordLengthError('    ')).not.toBeNull()
    expect(passwordLengthError('  12  ')).not.toBeNull()
    expect(passwordLengthError('  1234  ')).toBeNull()
  })

  test('createSettingsPassword rejects a short password', async () => {
    await expect(createSettingsPassword('abc')).rejects.toThrow(/at least 4/)
  })

  test('isStoredSettingsPassword accepts a complete record and rejects garbage', () => {
    expect(isStoredSettingsPassword(validRecord)).toBe(true)
    expect(isStoredSettingsPassword(null)).toBe(false)
    expect(isStoredSettingsPassword({ hash: 'ab', salt: 'cd', iterations: 10 })).toBe(false)
    expect(isStoredSettingsPassword({ ...validRecord, iterations: 0 })).toBe(false)
    expect(isStoredSettingsPassword({ ...validRecord, iterations: 1_000_000 })).toBe(false)
  })

  test('verifySettingsPassword returns false for a malformed record', async () => {
    await expect(verifySettingsPassword('secret', { hash: 'zz', salt: 'not-hex', iterations: 1 }))
      .resolves.toBe(false)
  })
})
