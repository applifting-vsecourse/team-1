import { hasEndedTerm } from "@/modules/applications/domain/term-ended"

const terms = [
  { id: "past", endsOn: "2026-07-08" },
  { id: "today", endsOn: "2026-11-09" },
  { id: "future", endsOn: "2027-07-08" },
]

describe("hasEndedTerm", () => {
  it("is true when a requested term ended before today", () => {
    expect(hasEndedTerm(terms, ["future", "past"], "2026-11-09")).toBe(true)
  })

  it("counts the last day of a term as still running", () => {
    expect(hasEndedTerm(terms, ["today"], "2026-11-09")).toBe(false)
    expect(hasEndedTerm(terms, ["today"], "2026-11-10")).toBe(true)
  })

  it("ignores terms that were not requested", () => {
    expect(hasEndedTerm(terms, ["future"], "2026-11-09")).toBe(false)
  })

  it("is false without requested terms", () => {
    expect(hasEndedTerm(terms, [], "2026-11-09")).toBe(false)
  })
})
