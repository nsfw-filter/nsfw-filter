import { DEBUG } from './debug'

export type ILogger = {
  log: (string: string) => void
}

export class Logger implements ILogger {
  private readonly logger: Console | undefined

  constructor () {
    if (DEBUG) this.logger = console
  }

  log (string: string): void {
    if (this.logger !== undefined) this.logger.log(string)
  }
}
