import { DEBUG } from './debug'

class Logger {
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

export const logger = new Logger()
