import { termStatusSummary } from "./term-status-summary"

describe("term status summary", () => {
  it("shows total occupancy but checks confirmation against beds of the participant's gender", () => {
    expect(
      termStatusSummary(
        { status: "WAITLISTED", priceCzk: 1000 },
        [],
        [
          { capacity: 1, extraBeds: 0, gender: "FEMALE" },
          { capacity: 2, extraBeds: 1, gender: "MALE" },
        ],
        ["FEMALE"],
        "FEMALE",
      ),
    ).toEqual({
      owedCzk: 0,
      capacity: 4,
      occupied: 1,
      confirmationCapacity: 1,
      confirmationOccupied: 1,
      confirmationDueCzk: 1000,
    })
  })
  it("counts shared rooms once and keeps existing payments when confirming", () => {
    expect(
      termStatusSummary(
        { status: "WAITLISTED", priceCzk: 1000 },
        [{ amountCzk: 300 }],
        [{ capacity: 2, extraBeds: 0, gender: null }],
        ["MALE", "FEMALE"],
        "FEMALE",
      ),
    ).toEqual({
      owedCzk: -300,
      capacity: 2,
      occupied: 2,
      confirmationCapacity: 2,
      confirmationOccupied: 2,
      confirmationDueCzk: 700,
    })
  })
})
