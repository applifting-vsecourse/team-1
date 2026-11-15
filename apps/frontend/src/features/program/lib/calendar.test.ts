import { describe, expect, it } from "vitest"

import { hourRange, overlapping, placeBlocks, toMinutes } from "@/features/program/lib/calendar"

const block = (id: string, startTime: string, endTime: string) => ({ id, startTime, endTime })

describe("program calendar", () => {
  it("converts a time to minutes", () => {
    expect(toMinutes("09:30")).toBe(570)
  })

  it("shows 7:00–18:00, from an earlier start and to midnight when a block ends after 18:00", () => {
    expect(hourRange([block("a", "09:00", "18:00")])).toEqual({ from: 7, to: 18 })
    expect(hourRange([block("a", "05:30", "10:00")])).toEqual({ from: 5, to: 18 })
    expect(hourRange([block("b", "17:00", "18:30")])).toEqual({ from: 7, to: 24 })
  })

  it("finds blocks of the same day that overlap a time, not those that only touch it", () => {
    const blocks = [
      { ...block("a", "09:00", "10:00"), date: "2027-07-12" },
      { ...block("b", "10:00", "11:00"), date: "2027-07-12" },
      { ...block("c", "09:30", "10:30"), date: "2027-07-13" },
    ]
    const candidate = { date: "2027-07-12", startTime: "09:30", endTime: "10:00" }
    expect(overlapping(blocks, candidate).map((item) => item.id)).toEqual(["a"])
    expect(overlapping(blocks, candidate, "a")).toEqual([])
  })

  it("gives blocks that do not overlap the full width", () => {
    const placed = placeBlocks([block("a", "09:00", "10:00"), block("b", "10:00", "11:00")])
    expect(placed.map((item) => [item.block.id, item.column, item.columns])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
    ])
  })

  it("puts overlapping blocks side by side and reuses a free column", () => {
    const placed = placeBlocks([
      block("a", "09:00", "11:00"),
      block("b", "10:00", "10:30"),
      block("c", "10:30", "12:00"),
      block("d", "13:00", "14:00"),
    ])
    expect(placed.map((item) => [item.block.id, item.column, item.columns])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 1, 2],
      ["d", 0, 1],
    ])
  })
})
