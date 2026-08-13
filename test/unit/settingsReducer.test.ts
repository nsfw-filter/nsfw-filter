import { clearSettingsPassword, setSettingsPassword, toggleEnabled } from '../../src/popup/redux/actions/settings'
import { settings, SettingsState } from '../../src/popup/redux/reducers/settings'

const password = { hash: 'aa', salt: 'bb', iterations: 120000 }

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
})
