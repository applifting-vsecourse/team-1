import { decideStay } from "./stay"

const term = { startsOn: new Date("2027-07-12"), endsOn: new Date("2027-07-19") }

describe("decideStay", () => {
  it("accepts nothing, one value or both", () => {
    expect(decideStay({ lateArrival: null, earlyDeparture: null }, term)).toEqual({
      kind: "ok",
      lateArrivalAt: null,
      earlyDepartureAt: null,
    })
    expect(decideStay({ lateArrival: "2027-07-13T10:30", earlyDeparture: null }, term).kind).toBe(
      "ok",
    )
    expect(
      decideStay({ lateArrival: "2027-07-13T10:30", earlyDeparture: "2027-07-18T16:00" }, term)
        .kind,
    ).toBe("ok")
  })

  it("takes the first and the last day of the term", () => {
    expect(
      decideStay({ lateArrival: "2027-07-12T00:00", earlyDeparture: "2027-07-19T23:59" }, term)
        .kind,
    ).toBe("ok")
  })

  it("refuses a day outside the term", () => {
    expect(decideStay({ lateArrival: "2027-07-11T10:30", earlyDeparture: null }, term).kind).toBe(
      "arrival_outside_term",
    )
    expect(decideStay({ lateArrival: null, earlyDeparture: "2027-07-20T10:30" }, term).kind).toBe(
      "departure_outside_term",
    )
  })

  it("refuses a departure that is not later than the arrival", () => {
    for (const earlyDeparture of ["2027-07-13T09:45", "2027-07-13T10:30"]) {
      expect(decideStay({ lateArrival: "2027-07-13T10:30", earlyDeparture }, term).kind).toBe(
        "departure_not_after_arrival",
      )
    }
  })

  it("refuses malformed values", () => {
    expect(decideStay({ lateArrival: "tomorrow", earlyDeparture: null }, term).kind).toBe("invalid")
  })
})
