import { describe, expect, it } from "vitest"

import type { MyApplication } from "@/features/participant/api/applications"
import { paymentTask } from "@/features/participant/lib/payment-task"

const term = (termId: string) => ({
  termId,
  name: termId,
  startsOn: "2027-07-04",
  endsOn: "2027-07-10",
  status: "CONFIRMED" as const,
  priceCzk: 4500,
  transportOffered: false,
  transportDecided: false,
  termEditable: true,
})
const payment = (termId: string, owedCzk: number, paymentDeadline: string | null) => ({
  termId,
  termNumber: 1,
  variableSymbol: "48001",
  dueCzk: 4500,
  paidCzk: 4500 - owedCzk,
  owedCzk,
  paymentStatus: "PARTIALLY_PAID" as const,
  paymentDeadline,
})
const application = (
  payableCzk: number,
  payments: ReturnType<typeof payment>[],
): Pick<MyApplication, "terms" | "paymentDetails"> => ({
  terms: [term("t1"), term("t2"), term("t3")],
  paymentDetails: {
    bankAccount: "2900123456/2010",
    summary: { variableSymbol: "48000", payableCzk },
    terms: payments,
  },
})

describe("paymentTask", () => {
  it("sums the debt with the owing terms and the earliest due date", () => {
    const task = paymentTask(
      application(1200, [
        payment("t1", 500, "2026-12-15T00:00:00.000Z"),
        payment("t2", 700, "2026-12-08T00:00:00.000Z"),
        payment("t3", -100, null),
      ]) as MyApplication,
    )

    expect(task?.amountCzk).toBe(1200)
    expect(task?.terms.map(({ termId }) => termId)).toEqual(["t1", "t2"])
    expect(task?.deadline).toBe("2026-12-08T00:00:00.000Z")
  })

  it("has no due date when no owing term has one", () => {
    const task = paymentTask(application(500, [payment("t1", 500, null)]) as MyApplication)

    expect(task?.deadline).toBeNull()
  })

  it("is nothing when nothing is payable or there are no payment details", () => {
    expect(paymentTask(application(0, [payment("t1", -100, null)]) as MyApplication)).toBeNull()
    expect(
      paymentTask({ ...application(500, []), paymentDetails: null } as MyApplication),
    ).toBeNull()
  })
})
