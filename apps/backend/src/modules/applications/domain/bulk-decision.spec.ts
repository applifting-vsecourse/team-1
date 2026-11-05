import { DECISION_TARGET, planBulkDecision } from "@/modules/applications/domain/bulk-decision"

const at = (minute: number) => new Date(Date.UTC(2027, 2, 10, 9, minute))
const candidate = (
  applicationId: string,
  status: "TO_EVALUATE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED",
  minute: number,
  number = 1,
) => ({ applicationId, status, submittedAt: at(minute), number })

describe("planBulkDecision", () => {
  it("changes only those waiting for evaluation, in order of receipt, whatever order they were selected in", () => {
    const plan = planBulkDecision(
      [
        candidate("petr", "TO_EVALUATE", 2),
        candidate("jana", "TO_EVALUATE", 3),
        candidate("adam", "TO_EVALUATE", 1),
      ],
      ["jana", "petr", "adam"],
    )
    expect(plan).toEqual({ changeable: ["adam", "petr", "jana"], skipped: [] })
  })

  it("skips the confirmed, waitlisted and cancelled, and ids that are not applications of the term", () => {
    const plan = planBulkDecision(
      [
        candidate("adam", "TO_EVALUATE", 1),
        candidate("jana", "CONFIRMED", 2),
        candidate("petr", "WAITLISTED", 3),
        candidate("eva", "CANCELLED", 4),
      ],
      ["adam", "jana", "petr", "eva", "gone"],
    )
    expect(plan).toEqual({ changeable: ["adam"], skipped: ["jana", "petr", "eva", "gone"] })
  })

  it("breaks a tie of equal arrival times by the application number", () => {
    const plan = planBulkDecision(
      [candidate("second", "TO_EVALUATE", 1, 8), candidate("first", "TO_EVALUATE", 1, 7)],
      ["second", "first"],
    )
    expect(plan.changeable).toEqual(["first", "second"])
  })

  it("moves to Náhradník or Zrušená", () => {
    expect(DECISION_TARGET).toEqual({ WAITLIST: "WAITLISTED", REJECT: "CANCELLED" })
  })
})
