import { describe, expect, it, vi } from "vitest"

import {
  BulkRoomsInterrupted,
  formatNumbers,
  runBulkRooms,
  splitBulkRooms,
} from "@/features/events/lib/bulk-rooms"

describe("splitBulkRooms", () => {
  it("sends up to 200 rooms in one request", () => {
    expect(splitBulkRooms({ shared: 200 }, 4, 1)).toEqual([
      { capacity: 4, firstNumber: 1, count: 200 },
    ])
    expect(splitBulkRooms({ female: 120, male: 80 }, 4, 1)).toEqual([
      { capacity: 4, firstNumber: 1, countFemale: 120, countMale: 80 },
    ])
  })

  it("splits 250 shared rooms into 200 + 50 with continuous numbering", () => {
    expect(splitBulkRooms({ shared: 250 }, 4, 101)).toEqual([
      { capacity: 4, firstNumber: 101, count: 200 },
      { capacity: 4, firstNumber: 301, count: 50 },
    ])
  })

  it("keeps women's rooms before men's across requests", () => {
    expect(splitBulkRooms({ female: 150, male: 100 }, 2, 1)).toEqual([
      { capacity: 2, firstNumber: 1, countFemale: 150, countMale: 50 },
      { capacity: 2, firstNumber: 201, countFemale: 0, countMale: 50 },
    ])
    expect(splitBulkRooms({ female: 250, male: 0 }, 2, 1)).toEqual([
      { capacity: 2, firstNumber: 1, countFemale: 200, countMale: 0 },
      { capacity: 2, firstNumber: 201, countFemale: 50, countMale: 0 },
    ])
  })
})

describe("runBulkRooms", () => {
  const requests = splitBulkRooms({ shared: 450 }, 1, 1)

  it("adds up created and skipped names of all requests", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ created: ["1"], skipped: ["2"] })
      .mockResolvedValueOnce({ created: ["3"], skipped: [] })
      .mockResolvedValueOnce({ created: ["4"], skipped: ["5"] })
    expect(await runBulkRooms(requests, send)).toEqual({
      created: ["1", "3", "4"],
      skipped: ["2", "5"],
    })
  })

  it("stops at the first failing request and reports what already exists", async () => {
    const failure = new Error("boom")
    const send = vi
      .fn()
      .mockResolvedValueOnce({ created: ["1", "2"], skipped: [] })
      .mockRejectedValueOnce(failure)
    const error = await runBulkRooms(requests, send).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(BulkRoomsInterrupted)
    expect((error as BulkRoomsInterrupted).reason).toBe(failure)
    expect((error as BulkRoomsInterrupted).done).toEqual({ created: ["1", "2"], skipped: [] })
    expect(send).toHaveBeenCalledTimes(2)
  })
})

describe("formatNumbers", () => {
  it("joins consecutive numbers into ranges", () => {
    expect(formatNumbers(["109", "110", "111", "120", "122", "123"])).toBe("109–111, 120, 122–123")
    expect(formatNumbers(["7"])).toBe("7")
    expect(formatNumbers([])).toBe("")
  })

  it("cuts a long list", () => {
    const names = Array.from({ length: 30 }, (_, index) => String(index * 2))
    expect(formatNumbers(names, 3)).toBe("0, 2, 4, …")
  })
})
