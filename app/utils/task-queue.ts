/**
 * 墨萃 (InkGist) 高性能并发任务调度队列 (TaskQueue)
 * 支持最大并发限制、任务入队排队、取消中断与进度跟踪
 */

export interface TaskItem<T> {
  id: string
  fn: () => Promise<T>
}

export interface TaskResult<T> {
  id: string
  success: boolean
  data?: T
  error?: any
}

export class TaskQueue<T = any> {
  private maxConcurrency: number
  private queue: TaskItem<T>[] = []
  private runningCount = 0
  private isCancelled = false
  private results: TaskResult<T>[] = []
  private onProgressCallback?: (completed: number, total: number, result: TaskResult<T>) => void

  constructor(concurrency = 5) {
    this.maxConcurrency = Math.max(1, concurrency)
  }

  /**
   * 添加单个任务到队列
   */
  addTask(id: string, fn: () => Promise<T>): void {
    this.queue.push({ id, fn })
  }

  /**
   * 批量添加任务到队列
   */
  addTasks(tasks: Array<{ id: string; fn: () => Promise<T> }>): void {
    this.queue.push(...tasks)
  }

  /**
   * 设置进度监听回调
   */
  onProgress(callback: (completed: number, total: number, result: TaskResult<T>) => void): void {
    this.onProgressCallback = callback
  }

  /**
   * 取消后续排队任务并标记中断
   */
  cancel(): void {
    this.isCancelled = true
    this.queue = []
  }

  /**
   * 获取当前排队中的任务数
   */
  get pendingCount(): number {
    return this.queue.length
  }

  /**
   * 获取当前正在执行的任务数
   */
  get activeCount(): number {
    return this.runningCount
  }

  /**
   * 执行所有任务直至队列全部清空或被取消
   */
  async run(): Promise<TaskResult<T>[]> {
    this.isCancelled = false
    this.results = []
    const total = this.queue.length
    if (total === 0) return []

    return new Promise<TaskResult<T>[]>((resolve) => {
      const checkAndRunNext = () => {
        if (this.isCancelled) {
          if (this.runningCount === 0) {
            resolve(this.results)
          }
          return
        }

        if (this.queue.length === 0 && this.runningCount === 0) {
          resolve(this.results)
          return
        }

        while (this.runningCount < this.maxConcurrency && this.queue.length > 0 && !this.isCancelled) {
          const task = this.queue.shift()
          if (!task) break

          this.runningCount++
          task.fn()
            .then((data) => {
              const res: TaskResult<T> = { id: task.id, success: true, data }
              this.results.push(res)
              if (this.onProgressCallback) {
                this.onProgressCallback(this.results.length, total, res)
              }
            })
            .catch((error) => {
              const res: TaskResult<T> = { id: task.id, success: false, error }
              this.results.push(res)
              if (this.onProgressCallback) {
                this.onProgressCallback(this.results.length, total, res)
              }
            })
            .finally(() => {
              this.runningCount--
              checkAndRunNext()
            })
        }
      }

      checkAndRunNext()
    })
  }
}
