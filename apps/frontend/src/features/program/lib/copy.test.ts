import { describe, expect, it } from "vitest"

import { previewCopy } from "@/features/program/lib/copy"

const block = (date: string, startTime: string, endTime: string, name: string) => ({
  date,
  startTime,
  endTime,
  name,
})

describe("previewCopy", () => {
  const source = {
    startsOn: "2027-07-19",
    endsOn: "2027-07-21",
    blocks: [
      block("2027-07-19", "10:00", "11:00", "A"),
      block("2027-07-21", "10:00", "11:00", "C"),
    ],
  }
  const target = { startsOn: "2027-07-12", endsOn: "2027-07-13" }

  it("maps day N to day N and counts the blocks of days the target lacks", () => {
    const plan = previewCopy(source, target, [])
    expect(plan.copies.map((item) => [item.name, item.date])).toEqual([["A", "2027-07-12"]])
    expect(plan.skipped).toBe(1)
    expect(plan.skippedDays).toEqual([3])
  })

  it("reports an overlap with a kept block, not a touching one", () => {
    const plan = previewCopy(source, target, [
      block("2027-07-12", "10:30", "12:00", "Hry"),
      block("2027-07-12", "11:00", "12:00", "Touch"),
    ])
    expect(plan.overlaps).toEqual([{ date: "2027-07-12", first: "A", second: "Hry" }])
  })
})
