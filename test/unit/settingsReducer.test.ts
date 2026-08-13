import { clearSettingsPassword, setSettingsPassword, toggleEnabled } from '../../src/popup/redux/actions/settings'
import { settings, SettingsState } from '../../src/popup/redux/reducers/settings'
import { HASH_HEX_LENGTH, SALT_HEX_LENGTH, StoredSettingsPassword } from '../../src/utils/settingsPassword'

const password = {
  hash: 'a'.repeat(HASH_HEX_LENGTH),
  salt: 'b'.repeat(SALT_HEX_LENGTH),
  iterations: 120000
}

describe('popup => redux => settings', () => {
  test('setSettingsPassword stores the hash record', () => {
    const next = settings(undefined, setSettingsPassword(password))
    expect(next.settingsPassword).toEqual(password)
  })

  test('clearSettingsPassword removes the lock', () => {
    const locked = settings(undefined, setSettingsPassword(password))
    const next = settings(locked, clearSettingsPassword())
    expect(next.settingsPassword).toBeNull()
  })

  test('backfills settingsPassword on state hydrated from an older version', () => {
    const legacy = {
      enabled: true,
      logging: false,
      filterEffect: 'blur',
      trainedModel: 'ViT_NSFW_384',
      filterStrictness: 55,
      websites: []
    } as unknown as SettingsState

    const next = settings(legacy, { type: '@@unknown' } as never)
    expect(next.settingsPassword).toBeNull()
    expect(next.enabled).toBe(true)
  })

  test('drops a corrupt settingsPassword record', () => {
    const corrupt = settings(undefined, toggleEnabled())
    const next = settings(
      { ...corrupt, settingsPassword: { hash: '', salt: '', iterations: 0 } },
      { type: '@@unknown' } as never
    )
    expect(next.settingsPassword).toBeNull()
  })

  test('refuses to persist a malformed password payload', () => {
    const next = settings(
      undefined,
      setSettingsPassword({ hash: 'aa', salt: 'bb', iterations: 1 } as StoredSettingsPassword)
    )
    expect(next.settingsPassword).toBeNull()
  })
})
