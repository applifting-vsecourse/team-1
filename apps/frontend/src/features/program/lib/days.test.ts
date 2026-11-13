import { describe, expect, it } from "vitest"

import type { ProgramBlock } from "@/features/program/api/program"
import { daysOfTerm, formatDay, groupByDay, timeRange } from "@/features/program/lib/days"

const block = (id: string, date: string, startTime = "10:00"): ProgramBlock => ({
  id,
  date,
  startTime,
  endTime: "11:00",
  name: id,
  place: null,
  description: null,
})
const term = { startsOn: "2027-07-12", endsOn: "2027-07-14" }

describe("program days", () => {
  it("lists every day of the term, ends included", () => {
    expect(daysOfTerm(term)).toEqual(["2027-07-12", "2027-07-13", "2027-07-14"])
  })

  it("gives the organizer every day, the participant only days with a block", () => {
    const blocks = [block("a", "2027-07-13"), block("b", "2027-07-13", "12:00")]
    expect(
      groupByDay({ ...term, blocks }, true).map((day) => [day.date, day.blocks.length]),
    ).toEqual([
      ["2027-07-12", 0],
      ["2027-07-13", 2],
      ["2027-07-14", 0],
    ])
    expect(groupByDay({ ...term, blocks }, false).map((day) => day.date)).toEqual(["2027-07-13"])
  })

  it("keeps a block on a day the term no longer has", () => {
    const days = groupByDay({ ...term, blocks: [block("late", "2027-07-20")] }, true)
    expect(days.at(-1)).toMatchObject({ date: "2027-07-20" })
  })

  it("formats a time range and a day with a capitalised weekday", () => {
    expect(timeRange({ startTime: "09:00", endTime: "10:30" })).toBe("09:00–10:30")
    expect(formatDay("2027-07-12")).toMatch(/^Monday/)
  })
})
