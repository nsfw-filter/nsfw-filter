import { DEBUG } from './debug'
import { ILogger } from './Logger'

type _Performance = Performance & {
  readonly memory: {
    jsHeapSizeLimit: number
    totalJSHeapSize: number
    usedJSHeapSize: number
  }
}

type IMemory = {
  start: () => void
}

export class Memory implements IMemory {
  private readonly DEBUG: boolean
  private TIMER: number
  protected readonly logger: ILogger

  constructor (logger: ILogger) {
    this.logger = logger
    this.DEBUG = DEBUG
    this.TIMER = 0
  }

  public start (): void {
    if (!this.DEBUG) return

    const memory = (window.performance as _Performance).memory

    // Only for Google Chrome
    if (memory !== undefined) {
      const result = this.formatBytes(memory.usedJSHeapSize)
      this.logger.log(`Memory usage: ${result}`)

      clearTimeout(this.TIMER)
      this.TIMER = window.setTimeout(() => { this.start() }, 10000)
    }
  }

  // https://stackoverflow.com/a/18650828/10432429
  private formatBytes (bytes: number): string {
    const decimals = 2
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }
}
