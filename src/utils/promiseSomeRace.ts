// Tests are here https://stackoverflow.com/a/51160869/10432429

export const promiseSomeRace = async (arr: Array<Promise<boolean>>): Promise<boolean> => {
  // Don't mutate arguemnts
  const arrCopy = arr.slice(0)

  // Wait until we run out of Promises
  while (arrCopy.length > 0) {
    // Give all our promises IDs so that we can remove them when they are done
    const arrWithIDs = arrCopy.map(async (promise, idx) => {
      return await promise
        .then(result => ({ idx, result }))
        .catch(_err => ({ idx, result: false }))
    })

    // Wait for one of the Promises to resolve
    const soon: {idx: number, result: boolean} = await Promise.race(arrWithIDs)

    // If it passes the test, we're done
    if (soon.result) return true

    // Otherwise, remove that Promise and race again
    arrCopy.splice(soon.idx, 1)
  }

  // No Promises passed the test
  return false
}
