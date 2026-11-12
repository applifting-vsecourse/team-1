import { applicationList, ListedApplication } from "./application-list"
import { ATTENTION_FILTERS, computeAttention } from "./attention"
import { paymentOverview, PaymentOverviewTerm } from "./payment-overview"

const base = {
  birthDate: new Date("2000-01-01"),
  email: "x@example.com",
  submittedAt: new Date("2026-10-01"),
  evaluationMode: "MANUAL" as const,
  firstName: "A",
  lastName: "B",
  gender: "FEMALE" as const,
}
const term = (
  status: ListedApplication["terms"][number]["status"],
  payments: number[] = [],
  id = "t1",
): ListedApplication["terms"][number] => ({
  id,
  name: id,
  startsOn: new Date("2027-07-01"),
  endsOn: new Date("2027-07-07"),
  roomMode: "GENDERED",
  rooms: [{ capacity: 2, extraBeds: 0, gender: "FEMALE" }],
  status,
  priceCzk: 1000,
  termNumber: 1,
  payments: payments.map((amountCzk) => ({ amountCzk })),
})
const applications: ListedApplication[] = [
  { ...base, id: "a1", number: 1, terms: [term("TO_EVALUATE")] },
  { ...base, id: "a2", number: 2, terms: [term("CONFIRMED", [400])] },
  { ...base, id: "a3", number: 3, terms: [term("CONFIRMED", [1000])] },
  // Overpaid in one term, in debt in the other: still a debtor (D-088).
  {
    ...base,
    id: "a4",
    number: 4,
    terms: [term("CONFIRMED", [1500], "t1"), term("CONFIRMED", [], "t2")],
  },
  { ...base, id: "a5", number: 5, terms: [term("WAITLISTED")] },
]
const paymentTerms: PaymentOverviewTerm[] = applications.flatMap((application) =>
  application.terms
    .filter((item) => item.status === "CONFIRMED")
    .map((item) => ({
      applicationId: application.id,
      firstName: "A",
      lastName: "B",
      termId: item.id,
      termName: item.name,
      startsOn: item.startsOn,
      endsOn: item.endsOn,
      priceCzk: item.priceCzk,
      evaluatedAt: new Date("2026-10-01"),
      confirmedAt: null,
      paymentPeriodStartedAt: null,
      paymentReminderSentAt: null,
      payments: item.payments,
    })),
)
const payments = paymentOverview(paymentTerms, 10, new Date("2026-11-07T12:00:00Z"))

describe("attention", () => {
  it("counts applications to evaluate like the list filtered by that card", () => {
    const attention = computeAttention(applications, payments, 0)
    expect(attention.toEvaluateCount).toBe(1)
    expect(attention.toEvaluateCount).toBe(
      applicationList(applications, ATTENTION_FILTERS.toEvaluate).length,
    )
  })

  it("counts waitlisted applications with a free bed like the list filtered by that card", () => {
    const attention = computeAttention(applications, payments, 0)
    // The women's room has 2 beds, held by a2, a3 and a4 (in t1): a5 waits without a free bed.
    expect(attention.substituteCount).toBe(0)
    expect(attention.substituteCount).toBe(
      applicationList(applications, ATTENTION_FILTERS.substitutes).length,
    )
    // Once two of them leave, a bed is free and a5 can be approved.
    const freed = applications.filter((application) => !["a2", "a3"].includes(application.id))
    expect(computeAttention(freed, payments, 0).substituteCount).toBe(1)
    expect(applicationList(freed, ATTENTION_FILTERS.substitutes).map((row) => row.id)).toEqual([
      "a5",
    ])
  })

  it("takes the debt figures from the payments overview and matches the debt filter", () => {
    const attention = computeAttention(applications, payments, 0)
    expect(attention.debt).toEqual({
      debtorCount: payments.debtorCount,
      overdueCount: payments.overdueCount,
      totalDebtCzk: payments.totalDebtCzk,
    })
    expect(attention.debt.debtorCount).toBe(2)
    expect(attention.debt.totalDebtCzk).toBe(600 + 1000)
    expect(attention.debt.debtorCount).toBe(
      applicationList(applications, ATTENTION_FILTERS.debt).map((row) => row.id).length,
    )
    expect(applicationList(applications, ATTENTION_FILTERS.debt).map((row) => row.id)).toEqual([
      "a2",
      "a4",
    ])
  })

  it("passes the number of change requests awaiting approval", () => {
    expect(computeAttention([], paymentOverview([], 10, new Date()), 2).changeRequestCount).toBe(2)
  })
})
