import { describe, expect, it } from "vitest"

import { hourRange, placeBlocks, toMinutes } from "@/features/program/lib/calendar"

const block = (id: string, startTime: string, endTime: string) => ({ id, startTime, endTime })

describe("program calendar", () => {
  it("converts a time to minutes", () => {
    expect(toMinutes("09:30")).toBe(570)
  })

  it("shows 7:00–21:00 and widens the range for an earlier or later block", () => {
    expect(hourRange([block("a", "09:00", "10:00")])).toEqual({ from: 7, to: 21 })
    expect(hourRange([block("a", "05:30", "10:00"), block("b", "20:00", "22:15")])).toEqual({
      from: 5,
      to: 23,
    })
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
