import {
  createSettingsPassword,
  isStoredSettingsPassword,
  passwordLengthError,
  verifySettingsPassword
} from '../../src/utils/settingsPassword'

describe('utils => settingsPassword', () => {
  test('createSettingsPassword hashes and verifySettingsPassword accepts the original', async () => {
    const stored = await createSettingsPassword('secret-1')
    expect(stored.hash).toMatch(/^[0-9a-f]+$/)
    expect(stored.salt).toMatch(/^[0-9a-f]+$/)
    expect(stored.hash).not.toContain('secret')
    await expect(verifySettingsPassword('secret-1', stored)).resolves.toBe(true)
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

  test('passwordLengthError enforces a minimum length', () => {
    expect(passwordLengthError('123')).not.toBeNull()
    expect(passwordLengthError('1234')).toBeNull()
  })

  test('createSettingsPassword rejects a short password', async () => {
    await expect(createSettingsPassword('abc')).rejects.toThrow(/at least 4/)
  })

  test('isStoredSettingsPassword accepts a complete record and rejects garbage', () => {
    expect(isStoredSettingsPassword({ hash: 'ab', salt: 'cd', iterations: 10 })).toBe(true)
    expect(isStoredSettingsPassword(null)).toBe(false)
    expect(isStoredSettingsPassword({ hash: '', salt: 'cd', iterations: 10 })).toBe(false)
    expect(isStoredSettingsPassword({ hash: 'ab', salt: 'cd', iterations: 0 })).toBe(false)
  })

  test('verifySettingsPassword returns false for a malformed record', async () => {
    await expect(verifySettingsPassword('secret', { hash: 'zz', salt: 'not-hex', iterations: 1 }))
      .resolves.toBe(false)
  })
})
