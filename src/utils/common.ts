import { _Performance } from './types'

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

  console.log((window.performance as _Performance).memory)
  clearTimeout(memoryTimer)
  memoryTimer = window.setTimeout(() => { getMemory() }, 7000)
}
