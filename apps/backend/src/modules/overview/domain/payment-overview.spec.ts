import { paymentOverview, PaymentOverviewTerm } from "./payment-overview"

const now = new Date("2026-11-06T12:00:00Z")
const term: PaymentOverviewTerm = {
  applicationId: "a1",
  firstName: "Adam",
  lastName: "Dvořák",
  termId: "t1",
  termName: "Letní týden",
  startsOn: new Date("2027-07-01T00:00:00Z"),
  priceCzk: 4900,
  evaluatedAt: new Date("2026-10-25T12:00:00Z"),
  confirmedAt: null,
  paymentPeriodStartedAt: null,
  paymentReminderSentAt: null,
  payments: [{ amountCzk: 2000 }],
}

describe("payment overview", () => {
  it("uses the same term debt and status as the application list and counts a reminder once", () => {
    const result = paymentOverview(
      [{ ...term, paymentReminderSentAt: new Date("2026-11-04T10:00:00Z") }],
      10,
      now,
    )
    expect(result).toMatchObject({
      totalDebtCzk: 2900,
      debtorCount: 1,
      overdueCount: 1,
      entries: [
        {
          paymentStatus: "PARTIALLY_PAID",
          amountPaidCzk: 2000,
          amountOwedCzk: 2900,
          reminderCount: 1,
          overdue: true,
        },
      ],
    })
    expect(result.entries[0].paymentDueAt).toEqual(new Date("2026-11-04T12:00:00Z"))
  })

  it("does not offset a term's debt with an overpayment of another term", () => {
    const result = paymentOverview(
      [
        term,
        {
          ...term,
          termId: "t2",
          priceCzk: 1000,
          payments: [{ amountCzk: 1500 }],
        },
      ],
      10,
      now,
    )
    expect(result.totalDebtCzk).toBe(2900)
    expect(result.debtorCount).toBe(1)
    expect(result.entries.find((entry) => entry.termId === "t2")).toMatchObject({
      paymentStatus: "OVERPAID",
      amountOwedCzk: -500,
      overdue: false,
    })
  })

  it("keeps a confirmed free term visible without a debt", () => {
    const result = paymentOverview([{ ...term, priceCzk: 0, payments: [] }], 10, now)
    expect(result.entries[0]).toMatchObject({
      paymentStatus: "NOTHING_DUE",
      amountOwedCzk: 0,
      overdue: false,
    })
    expect(result.totalDebtCzk).toBe(0)
  })

  it("starts the due period at a later confirmation and marks a last-minute confirmation overdue", () => {
    const confirmation = new Date("2027-06-26T12:00:00Z")
    const result = paymentOverview(
      [
        {
          ...term,
          confirmedAt: confirmation,
          payments: [],
        },
      ],
      10,
      confirmation,
    )
    expect(result.entries[0]).toMatchObject({ paymentStatus: "UNPAID", overdue: true })
    expect(result.entries[0].paymentDueAt).toEqual(confirmation)
  })

  it("restarts the due period after a correction creates debt", () => {
    const restarted = new Date("2026-11-05T12:00:00Z")
    const result = paymentOverview([{ ...term, paymentPeriodStartedAt: restarted }], 10, now)
    expect(result.entries[0]).toMatchObject({ overdue: false })
    expect(result.entries[0].paymentDueAt).toEqual(new Date("2026-11-15T12:00:00Z"))
    const late = paymentOverview(
      [
        {
          ...term,
          confirmedAt: new Date("2027-06-26T12:00:00Z"),
          paymentPeriodStartedAt: new Date("2027-06-27T12:00:00Z"),
        },
      ],
      10,
      new Date("2027-06-28T12:00:00Z"),
    )
    expect(late.entries[0].overdue).toBe(false)
  })

  it("uses a later reconfirmation instead of an older correction period", () => {
    const reconfirmed = new Date("2027-06-26T12:00:00Z")
    const result = paymentOverview(
      [
        {
          ...term,
          confirmedAt: reconfirmed,
          paymentPeriodStartedAt: new Date("2027-06-01T12:00:00Z"),
          payments: [],
        },
      ],
      10,
      reconfirmed,
    )
    expect(result.entries[0].paymentDueAt).toEqual(reconfirmed)
    expect(result.entries[0].overdue).toBe(true)
  })
})
