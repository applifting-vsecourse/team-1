import { participantChangeAllowed } from "./participant-term-change"

describe("participant change approval boundary (Prague calendar day)", () => {
  const beforeMidnight = new Date("2027-06-30T21:59:59Z")
  const midnight = new Date("2027-06-30T22:00:00Z")
  const start = new Date("2027-07-01T00:00:00Z")

  it("allows immediate changes with no date", () => {
    expect(participantChangeAllowed(null, midnight)).toBe(true)
  })

  it("allows changes through the preceding Prague day", () => {
    expect(participantChangeAllowed(start, beforeMidnight)).toBe(true)
  })

  it("requires approval from midnight in Prague on the start date", () => {
    expect(participantChangeAllowed(start, midnight)).toBe(false)
  })
})
