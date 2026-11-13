import { isDayWithinTerm, isEndAfterStart, normalizeInput } from "@/modules/program/domain/program"

const valid = { date: "2027-07-13", startTime: "10:00", endTime: "12:00", name: "Dílny" }

describe("normalizeInput", () => {
  it("trims the text and turns blank optional fields into null", () => {
    expect(
      normalizeInput({ ...valid, name: "  Dílny ", place: "  ", description: " Popis " }),
    ).toEqual({
      ...valid,
      place: null,
      description: "Popis",
    })
  })

  it.each([
    ["no name", { name: "  " }],
    ["name too long", { name: "x".repeat(101) }],
    ["not a day", { date: "2027-02-30" }],
    ["time without zero", { startTime: "9:00" }],
    ["time out of range", { endTime: "24:00" }],
    ["place too long", { place: "x".repeat(201) }],
    ["description too long", { description: "x".repeat(2001) }],
  ])("rejects %s", (_label, patch) => {
    expect(normalizeInput({ ...valid, ...patch })).toBeNull()
  })
})

describe("isEndAfterStart", () => {
  it("is strict and compares zero-padded times", () => {
    expect(isEndAfterStart("09:00", "10:30")).toBe(true)
    expect(isEndAfterStart("10:00", "10:00")).toBe(false)
    expect(isEndAfterStart("11:00", "10:00")).toBe(false)
  })
})

describe("isDayWithinTerm", () => {
  const term = { startsOn: "2027-07-12", endsOn: "2027-07-18" }
  it("includes the first and the last day", () => {
    expect(isDayWithinTerm("2027-07-12", term)).toBe(true)
    expect(isDayWithinTerm("2027-07-18", term)).toBe(true)
    expect(isDayWithinTerm("2027-07-11", term)).toBe(false)
    expect(isDayWithinTerm("2027-07-19", term)).toBe(false)
  })
})
