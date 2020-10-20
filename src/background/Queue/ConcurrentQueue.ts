import { OnSuccessParam, OnFailureParam } from './PredictionQueue'

type ConcurrentQueueParams = {
  concurrency: number
  timeout: number
  onProcess: Function
  onSuccess: Function
  onFailure: Function
  onDone?: Function
  onDrain?: Function
}

type IConcurrentQueue<Task> = {
  add: (task: Task) => void
}

export class ConcurrentQueue<Task> implements IConcurrentQueue<Task> {
  private readonly concurrency: number
  private readonly TIMEOUT: number
  private count: number
  private readonly waiting: Task[]

  private readonly onProcess: Function
  private readonly onSuccess: Function
  private readonly onFailure: Function
  private readonly onDone?: Function
  private readonly onDrain?: Function

  constructor ({
    concurrency,
    timeout,
    onProcess,
    onSuccess,
    onFailure,
    onDone,
    onDrain
  }: ConcurrentQueueParams) {
    this.concurrency = concurrency
    this.TIMEOUT = timeout
    this.count = 0
    this.waiting = []

    this.onProcess = onProcess
    this.onSuccess = onSuccess
    this.onFailure = onFailure
    this.onDone = onDone
    if (onDrain !== undefined) this.onDrain = onDrain
  }

  public add (task: Task): void {
    const hasChannel = this.count < this.concurrency

    if (hasChannel) {
      this.next(task)
      return
    }

    this.waiting.push(task)
  }

  private next (task: Task): void {
    this.count++

    this.onProcess(task, (err: OnFailureParam | undefined, result: OnSuccessParam | undefined) => {
      if (err !== undefined) {
        this.onFailure(err)
      } else {
        this.onSuccess(result)
      }

      if (this.onDone !== undefined) this.onDone(err !== undefined ? err : result)

      this.count--

      if (this.waiting.length > 0) {
        const task = this.waiting.shift() as Task
        setTimeout(() => this.next(task), this.TIMEOUT)
        return
      }

      if (this.count === 0 && this.waiting.length === 0) {
        if (this.onDrain !== undefined) this.onDrain()
      }
    })
  }
}
