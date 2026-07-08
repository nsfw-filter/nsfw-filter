// The allowlist is a set of hosts the user has chosen to leave unfiltered. It's
// edited from the popup (one-click "allow this site") and the options page, and
// read by the content script to decide whether to filter the current page. Both
// storing and matching go through here so a host is normalized the same way
// wherever it enters.

// Reduce any user input (a bare host, a full URL, a pasted address) to a bare
// registrable-ish host. A leading `www.` is dropped so `www.example.com` and
// `example.com` collapse to one entry, and isHostAllowed's subdomain rule then
// covers the `www.` visit anyway.
export const normalizeHostEntry = (input: string): string => {
  let host = input.trim().toLowerCase()
  if (host === '') return ''

  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//.test(host)) host = new URL(host).hostname
    else host = host.split('/')[0]
  } catch {
    host = host.split('/')[0]
  }

  host = host.split(':')[0]
  if (host.startsWith('www.')) host = host.slice(4)
  return host
}

// A page is allowed when its host equals an entry or is a subdomain of one. The
// dot in `.${entry}` is what stops `evilexample.com` from matching `example.com`
// while still letting `m.example.com` through.
export const isHostAllowed = (hostname: string, websites: string[]): boolean => {
  const host = hostname.trim().toLowerCase()
  if (host === '') return false

  return websites.some(entry => {
    const allowed = normalizeHostEntry(entry)
    if (allowed === '') return false
    return host === allowed || host.endsWith(`.${allowed}`)
  })
}
