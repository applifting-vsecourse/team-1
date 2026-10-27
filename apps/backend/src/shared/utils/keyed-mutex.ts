/**
 * Runs tasks with the same key one after another (in this process); tasks with
 * different keys run in parallel. A failed task does not block the next one.
 */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>()

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve()
    const result = previous.then(task)
    const tail = result.then(
      () => undefined,
      () => undefined,
    )
    this.tails.set(key, tail)
    try {
      return await result
    } finally {
      // Nobody queued behind this task: drop the key so the map does not grow.
      if (this.tails.get(key) === tail) this.tails.delete(key)
    }
  }
}
