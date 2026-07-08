import { isHostAllowed, normalizeHostEntry } from '../../src/utils/allowlist'

describe('utils => allowlist => normalizeHostEntry', () => {
  test('lowercases the host', () => {
    expect(normalizeHostEntry('Example.COM')).toBe('example.com')
  })

  test('strips protocol, path, and query', () => {
    expect(normalizeHostEntry('https://example.com/some/path?q=1')).toBe('example.com')
  })

  test('drops a leading www. so it dedupes against the bare domain', () => {
    expect(normalizeHostEntry('www.example.com')).toBe('example.com')
  })

  test('trims surrounding whitespace', () => {
    expect(normalizeHostEntry('   example.com  ')).toBe('example.com')
  })

  test('returns an empty string for input with no host', () => {
    expect(normalizeHostEntry('')).toBe('')
    expect(normalizeHostEntry('   ')).toBe('')
  })
})

describe('utils => allowlist => isHostAllowed', () => {
  test('matches an exact hostname', () => {
    expect(isHostAllowed('example.com', ['example.com'])).toBe(true)
  })

  test('matches a subdomain of an allowed entry', () => {
    expect(isHostAllowed('www.example.com', ['example.com'])).toBe(true)
    expect(isHostAllowed('m.example.com', ['example.com'])).toBe(true)
  })

  test('does not match a lookalike domain that only ends with the entry text', () => {
    expect(isHostAllowed('evilexample.com', ['example.com'])).toBe(false)
  })

  test('does not match an unrelated host', () => {
    expect(isHostAllowed('other.com', ['example.com'])).toBe(false)
  })

  test('tolerates un-normalized stored entries', () => {
    expect(isHostAllowed('www.example.com', ['https://www.Example.com/'])).toBe(true)
  })

  test('an empty allowlist allows nothing', () => {
    expect(isHostAllowed('example.com', [])).toBe(false)
  })
})
