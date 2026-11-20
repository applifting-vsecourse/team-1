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
      debtCzk: 0,
      confirmationExceedsCapacity: true,
      confirmationNextOccupied: 2,
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
      debtCzk: 0,
      confirmationExceedsCapacity: true,
      confirmationNextOccupied: 3,
      capacity: 2,
      occupied: 2,
      confirmationCapacity: 2,
      confirmationOccupied: 2,
      confirmationDueCzk: 700,
    })
  })
})

describe("capacity decisions in the status summary", () => {
  it.each([
    {
      name: "no rooms",
      capacity: 0,
      extraBeds: 0,
      people: [],
      exceeds: true,
      occupied: 0,
      next: 1,
    },
    {
      name: "already over capacity",
      capacity: 1,
      extraBeds: 0,
      people: ["FEMALE", "MALE"],
      exceeds: true,
      occupied: 2,
      next: 3,
    },
    {
      name: "a free extra bed",
      capacity: 1,
      extraBeds: 1,
      people: ["FEMALE"],
      exceeds: false,
      occupied: 1,
      next: 2,
    },
  ] as const)(
    "decides the confirmation for $name",
    ({ capacity, extraBeds, people, exceeds, occupied, next }) => {
      const summary = termStatusSummary(
        { status: "WAITLISTED", priceCzk: 1000 },
        [],
        capacity ? [{ capacity, extraBeds, gender: null }] : [],
        [...people],
        "FEMALE",
      )
      expect(summary.confirmationExceedsCapacity).toBe(exceeds)
      expect(summary.confirmationOccupied).toBe(occupied)
      expect(summary.confirmationNextOccupied).toBe(next)
    },
  )

  it("returns a positive display debt without moving that calculation to the client", () => {
    expect(
      termStatusSummary(
        { status: "CONFIRMED", priceCzk: 1000 },
        [{ amountCzk: 300 }],
        [],
        [],
        "FEMALE",
      ),
    ).toMatchObject({ owedCzk: 700, debtCzk: 700 })
  })
})
