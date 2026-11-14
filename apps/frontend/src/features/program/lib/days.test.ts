import { describe, expect, it } from "vitest"

import {
  calendarDays,
  daysOfTerm,
  formatDay,
  formatDayHeader,
  timeRange,
} from "@/features/program/lib/days"

const term = { startsOn: "2027-07-12", endsOn: "2027-07-14" }

describe("program days", () => {
  it("lists every day of the term, ends included", () => {
    expect(daysOfTerm(term)).toEqual(["2027-07-12", "2027-07-13", "2027-07-14"])
  })

  it("shows only the days of the term, plus a day outside it that still has a block", () => {
    expect(calendarDays({ ...term, blocks: [{ date: "2027-07-13" }] })).toEqual([
      "2027-07-12",
      "2027-07-13",
      "2027-07-14",
    ])
    expect(calendarDays({ ...term, blocks: [{ date: "2027-07-20" }] }).at(-1)).toBe("2027-07-20")
  })

  it("formats a time range and a day with a capitalised weekday", () => {
    expect(timeRange({ startTime: "09:00", endTime: "10:30" })).toBe("09:00–10:30")
    expect(formatDay("2027-07-12")).toMatch(/^Monday/)
    expect(formatDayHeader("2027-07-12").weekday).toBe("Mon")
  })
})
