import { planBulkConfirmation } from "@/modules/applications/domain/bulk-confirmation"

const at = (minute: number) => new Date(Date.UTC(2027, 2, 10, 9, minute))
const candidate = (
  applicationId: string,
  gender: "FEMALE" | "MALE",
  minute: number,
  number = 1,
) => ({
  applicationId,
  gender,
  submittedAt: at(minute),
  number,
})

describe("planBulkConfirmation", () => {
  const rooms = [
    { capacity: 2, gender: "MALE" as const },
    { capacity: 2, gender: "FEMALE" as const },
  ]

  it("confirms in order of receipt and leaves out those that do not fit, whatever order they were selected in", () => {
    // One man's bed and one woman's bed are free (the others are taken).
    const plan = planBulkConfirmation(
      rooms,
      ["MALE", "FEMALE"],
      [candidate("petr", "MALE", 2), candidate("jana", "FEMALE", 3), candidate("adam", "MALE", 1)],
    )
    expect(plan).toEqual({ confirmable: ["adam", "jana"], skipped: ["petr"] })
  })

  it("lets a later applicant of another gender in when an earlier one finds no bed", () => {
    const plan = planBulkConfirmation(
      rooms,
      ["MALE", "MALE"],
      [candidate("adam", "MALE", 1), candidate("jana", "FEMALE", 2)],
    )
    expect(plan).toEqual({ confirmable: ["jana"], skipped: ["adam"] })
  })

  it("breaks a tie of arrival times by the application number", () => {
    const plan = planBulkConfirmation(
      [{ capacity: 1, gender: "MALE" }],
      [],
      [candidate("second", "MALE", 1, 8), candidate("first", "MALE", 1, 7)],
    )
    expect(plan).toEqual({ confirmable: ["first"], skipped: ["second"] })
  })

  it("counts shared rooms as one pool for both genders", () => {
    const plan = planBulkConfirmation(
      [{ capacity: 2, gender: null }],
      ["MALE"],
      [candidate("jana", "FEMALE", 1), candidate("adam", "MALE", 2)],
    )
    expect(plan).toEqual({ confirmable: ["jana"], skipped: ["adam"] })
  })

  it("confirms nobody when no bed is free", () => {
    expect(planBulkConfirmation([], [], [candidate("adam", "MALE", 1)])).toEqual({
      confirmable: [],
      skipped: ["adam"],
    })
  })
})
