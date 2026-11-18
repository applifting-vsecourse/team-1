import { planBulkEvaluation } from "@/modules/applications/domain/bulk-evaluation"

const candidate = (id: string, gender: "FEMALE" | "MALE", minute: number) => ({
  applicationId: id,
  gender,
  submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
  number: minute,
})

describe("planBulkEvaluation", () => {
  it("confirms 10 and waitlists 10 of 20 selected applications for 10 free beds, in order of receipt", () => {
    const rooms = [{ capacity: 10, extraBeds: 0, gender: null }]
    // Selected in reverse order: the receipt order decides, not the selection.
    const candidates = Array.from({ length: 20 }, (_, index) =>
      candidate(`a${index}`, index % 2 ? "FEMALE" : "MALE", index),
    ).reverse()
    const plan = planBulkEvaluation(rooms, [], candidates)
    expect(plan.confirm).toEqual(Array.from({ length: 10 }, (_, index) => `a${index}`))
    expect(plan.waitlist).toEqual(Array.from({ length: 10 }, (_, index) => `a${index + 10}`))
  })

  it("confirms into the free beds of the applicant's gender only; a full group goes to the waitlist", () => {
    // One free woman's bed and one free man's bed.
    const rooms = [
      { capacity: 1, extraBeds: 0, gender: "FEMALE" as const },
      { capacity: 1, extraBeds: 0, gender: "MALE" as const },
    ]
    const plan = planBulkEvaluation(
      rooms,
      [],
      [
        candidate("adam", "MALE", 1),
        candidate("petr", "MALE", 2),
        candidate("jana", "FEMALE", 3),
        candidate("eva", "FEMALE", 4),
      ],
    )
    expect(plan).toEqual({ confirm: ["adam", "jana"], waitlist: ["petr", "eva"] })
  })

  it("waitlists everybody when no bed is free and confirms everybody when all fit", () => {
    const rooms = [{ capacity: 2, extraBeds: 0, gender: null }]
    expect(planBulkEvaluation(rooms, ["MALE", "MALE"], [candidate("a", "MALE", 1)])).toEqual({
      confirm: [],
      waitlist: ["a"],
    })
    expect(
      planBulkEvaluation(rooms, [], [candidate("b", "MALE", 2), candidate("a", "FEMALE", 1)]),
    ).toEqual({ confirm: ["a", "b"], waitlist: [] })
  })
})
