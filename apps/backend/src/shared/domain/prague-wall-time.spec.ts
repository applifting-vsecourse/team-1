import { fromPragueWallTime, toPragueWallTime } from "./prague-wall-time"

describe("Prague wall time", () => {
  it("round-trips in summer and winter time", () => {
    expect(toPragueWallTime(fromPragueWallTime("2027-07-13T10:30")!)).toBe("2027-07-13T10:30")
    expect(fromPragueWallTime("2027-07-13T10:30")!.toISOString()).toBe("2027-07-13T08:30:00.000Z")
    expect(fromPragueWallTime("2027-01-13T10:30")!.toISOString()).toBe("2027-01-13T09:30:00.000Z")
  })

  it("refuses what is not a real day and time", () => {
    expect(fromPragueWallTime("2027-02-30T10:30")).toBeNull()
    expect(fromPragueWallTime("2027-07-13T25:00")).toBeNull()
    expect(fromPragueWallTime("13. 7. 2027")).toBeNull()
  })
})
