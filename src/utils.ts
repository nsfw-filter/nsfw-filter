// Set DEBUG to true to start logging in the console
export const DEBUG = false

if (!DEBUG) {
  console.log = () => {}
}

// the image classes that needs to be filtered
export const FILTER_LIST = ['Hentai', 'Porn', 'Sexy']

let memoryTimer: number | undefined
export const getMemory = (): void => {
  if (!DEBUG) return

  console.log(window.performance.memory)
  clearTimeout(memoryTimer)
  memoryTimer = window.setTimeout(() => { getMemory() }, 7000)
}

export const isValidHttpUrl = (string: string): boolean => {
  try {
    const url: URL = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

type soonType = {
  idx: number
  result: boolean
}

export type predictionType = {
  className: string
  probability: number
}

export async function promiseSome (arr: Array<Promise<predictionType[]>>): Promise<boolean> {
  // Don't mutate arguemnts
  const arrCopy = arr.slice(0)

  // Wait until we run out of Promises
  while (arrCopy.length > 0) {
    // Give all our promises IDs so that we can remove them when they are done
    const arrWithIDs = arrCopy.map(async (promise, idx) => {
      return await promise
        .then(op => ({ idx, result: op.length > 0 && FILTER_LIST.includes(op[0].className) }))
        .catch(_err => ({ idx, result: false }))
    })

    // Wait for one of the Promises to resolve
    const soon: soonType = await Promise.race(arrWithIDs)

    // If it passes the test, we're done
    if (soon.result) return true

    // Otherwise, remove that Promise and race again
    arrCopy.splice(soon.idx, 1)
  }

  // No Promises passed the test
  return false
}

export const notEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined
}
