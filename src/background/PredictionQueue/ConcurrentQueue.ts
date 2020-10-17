import { OnSuccessParam, OnFailureParam } from './PredictionQueue'

type ConcurrentQueueParams = {
  concurrency: number
  onProcess: Function
  onSuccess: Function
  onFailure: Function
  onDone: Function
  onDrain: Function
}

type IConcurrentQueue = {
  add: (task: ConcurrentQueueTask) => void
  setConcurrency: (concurrency: number) => void
}

type ConcurrentQueueTask = {
  resolve: (value: boolean) => void
  reject: (error: string) => void
  url: string
  tabId?: number
}

export class ConcurrentQueue implements IConcurrentQueue {
  private concurrency: number
  private count: number
  private readonly waiting: ConcurrentQueueTask[]

  private readonly onProcess: Function
  private readonly onSuccess: Function
  private readonly onFailure: Function
  private readonly onDone: Function
  private readonly onDrain: Function

  constructor ({
    concurrency,
    onProcess,
    onSuccess,
    onFailure,
    onDone,
    onDrain
  }: ConcurrentQueueParams) {
    this.concurrency = concurrency
    this.count = 0
    this.waiting = []

    this.onProcess = onProcess
    this.onSuccess = onSuccess
    this.onFailure = onFailure
    this.onDone = onDone
    this.onDrain = onDrain
  }

  public setConcurrency (concurrency: number): void {
    this.concurrency = concurrency
  }

  public add (task: ConcurrentQueueTask): void {
    const hasChannel = this.count < this.concurrency

    if (hasChannel) {
      this.next(task)
      return
    }

    this.waiting.push(task)
  }

  private next (task: ConcurrentQueueTask): void {
    this.count++

    this.onProcess(task, (err: OnFailureParam | undefined, result: OnSuccessParam | undefined) => {
      if (err !== undefined) {
        this.onFailure(err)
      } else {
        this.onSuccess(result)
      }

      this.onDone(err !== undefined ? err : result)

      this.count--

      if (this.waiting.length > 0) {
        const task = this.waiting.shift() as ConcurrentQueueTask
        setTimeout(() => this.next(task), 0)
        return
      }

      if (this.count === 0 && this.waiting.length === 0) {
        this.onDrain()
      }
    })
  }
}
