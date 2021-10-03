
export type ILogger = {
  status: boolean

  log: (string: string) => void
  error: (reason: string | Error) => void
  enable: () => void
  disable: () => void
}

export class Logger implements ILogger {
  private readonly logger: Console
  public status: boolean

  constructor () {
    this.logger = console
    this.status = false
  }

  log (string: string): void {
    if (this.status) this.logger.log(string)
  }

  error (reason: string | Error): void {
    if (this.status) this.logger.error(reason)
  }

  enable (): void {
    this.status = true
  }

  disable (): void {
    this.status = false
  }
}
