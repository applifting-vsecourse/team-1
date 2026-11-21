import {
  isDayWithinTerm,
  isEndAfterStart,
  normalizeInput,
  planProgramCopy,
} from "@/modules/program/domain/program"

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

describe("planProgramCopy", () => {
  const block = (date: string, startTime: string, endTime: string, name = "A") => ({
    date,
    startTime,
    endTime,
    name,
    place: "Louka",
    description: "Popis",
  })
  const source = {
    term: { startsOn: "2027-07-19", endsOn: "2027-07-27" },
    blocks: [
      block("2027-07-19", "10:00", "11:00", "První"),
      block("2027-07-20", "10:00", "11:00", "Druhý"),
      block("2027-07-27", "10:00", "11:00", "Devátý"),
    ],
  }
  const target = { startsOn: "2027-07-12", endsOn: "2027-07-18" }

  it("maps the 1st day to the 1st day and skips days the target does not have", () => {
    const plan = planProgramCopy(source, target, [])
    expect(plan.blocks.map((b) => [b.name, b.date, b.place, b.description])).toEqual([
      ["První", "2027-07-12", "Louka", "Popis"],
      ["Druhý", "2027-07-13", "Louka", "Popis"],
    ])
    expect(plan.skipped).toBe(1)
    expect(plan.overlaps).toEqual([])
  })

  it("reports overlaps with kept blocks but not blocks that only touch", () => {
    const plan = planProgramCopy(source, target, [
      block("2027-07-12", "10:30", "12:00", "Hry"),
      block("2027-07-13", "11:00", "12:00", "Touch"),
    ])
    expect(plan.overlaps).toEqual([
      { date: "2027-07-12", first: "První", second: "Hry", startTime: "10:30", endTime: "11:00" },
    ])
  })
})
