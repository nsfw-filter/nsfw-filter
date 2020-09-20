export const prepareUrl = (string: string): string | undefined => {
  try {
    const url: URL = new URL(string)
    return (url.protocol === 'http:' || url.protocol === 'https:') ? string : undefined
  } catch {
    const FIRST_SLASH_REGEX = /^\/.*$/
    return FIRST_SLASH_REGEX.test(string) ? `${window.location.origin}${string}` : undefined
  }
}
