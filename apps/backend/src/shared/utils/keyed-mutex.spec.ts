import { KeyedMutex } from "./keyed-mutex"

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe("KeyedMutex", () => {
  it("runs tasks of one key one after another", async () => {
    const mutex = new KeyedMutex()
    const log: string[] = []
    const task = (name: string, ms: number) => async () => {
      log.push(`${name} start`)
      await delay(ms)
      log.push(`${name} end`)
    }

    await Promise.all([mutex.run("a", task("1", 20)), mutex.run("a", task("2", 1))])

    expect(log).toEqual(["1 start", "1 end", "2 start", "2 end"])
  })

  it("runs tasks of different keys in parallel", async () => {
    const mutex = new KeyedMutex()
    const log: string[] = []
    const task = (name: string) => async () => {
      log.push(`${name} start`)
      await delay(10)
    }

    await Promise.all([mutex.run("a", task("a")), mutex.run("b", task("b"))])

    expect(log).toEqual(["a start", "b start"])
  })

  it("keeps going after a failed task and returns results", async () => {
    const mutex = new KeyedMutex()
    const failed = mutex.run("a", () => Promise.reject(new Error("boom")))
    const next = mutex.run("a", () => Promise.resolve(42))

    await expect(failed).rejects.toThrow("boom")
    await expect(next).resolves.toBe(42)
  })
})
