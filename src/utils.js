'use strict'

// Set DEBUG to true to start logging in the console
export const DEBUG = false
if (!DEBUG) {
  console.log = () => {}
}

// the image classes that needs to be filtered
export const FILTER_LIST = ['Hentai', 'Porn', 'Sexy']

const getMemory = () => {
  if (!DEBUG) return

  console.log(window.performance.memory)
  setTimeout(() => { getMemory() }, 7000)
}
getMemory()

export const isValidHttpUrl = (string) => {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_err) {
    return false
  }
}

export async function promiseSome (arr) {
  const predicate = (v) => v
  // Don't mutate arguemnts
  const arrCopy = arr.slice(0)

  // Wait until we run out of Promises
  while (arrCopy.length) {
    // Give all our promises IDs so that we can remove them when they are done
    const arrWithIDs = arrCopy.map((promise, idx) => {
      return promise
        .then(op => ({ idx, result: op[0] && op[0].className && FILTER_LIST.includes(op[0].className) }))
        .catch(_err => ({ idx, result: false }))
    })

    // Wait for one of the Promises to resolve
    const soon = await Promise.race(arrWithIDs)

    // If it passes the test, we're done
    if (predicate(soon.result)) return true

    // Otherwise, remove that Promise and race again
    arrCopy.splice(soon.idx, 1)
  }

  // No Promises passed the test
  return false
}
