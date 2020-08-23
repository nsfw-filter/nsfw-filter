import { DEBUG } from './debug'

export type ILogger = {
  log: (string: string) => void
  warn: (string: string) => void
  error: (string: string) => void
}

export class Logger implements ILogger {
  private readonly logger: Console | undefined

  constructor () {
    if (DEBUG) this.logger = console
  }

  log (string: string): void {
    if (this.logger !== undefined) this.logger.log(string)
  }

  warn (string: string): void {
    if (this.logger !== undefined) this.logger.warn(string)
  }

  error (string: string): void {
    if (this.logger !== undefined) this.logger.error(string)
  }
}
