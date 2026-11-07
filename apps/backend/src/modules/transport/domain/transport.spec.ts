import { departureDay, isDepartureWithinTerm } from "./transport"

describe("departure within the term", () => {
  it("reads the day in Czech time", () => {
    expect(departureDay(new Date("2027-07-12T22:30:00.000Z"))).toBe("2027-07-13")
    expect(departureDay(new Date("2027-01-12T22:30:00.000Z"))).toBe("2027-01-12")
  })

  it("allows the last day of the term, also late in the evening", () => {
    expect(isDepartureWithinTerm(new Date("2027-07-18T19:30:00.000Z"), "2027-07-18")).toBe(true)
  })

  it("rejects a departure the day after the term ends", () => {
    expect(isDepartureWithinTerm(new Date("2027-07-18T22:30:00.000Z"), "2027-07-18")).toBe(false)
  })

  it("allows a departure before the term starts", () => {
    expect(isDepartureWithinTerm(new Date("2027-07-10T06:00:00.000Z"), "2027-07-18")).toBe(true)
  })
})
