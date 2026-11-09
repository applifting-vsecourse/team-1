import { PaymentApplication, paymentSummary, PaymentTerm } from "@/modules/payments/domain/payment"

const term = (id: string, number: number, priceCzk: number, paidCzk: number): PaymentTerm => ({
  applicationTermId: `at${number}`,
  termId: id,
  termNumber: number,
  termName: null,
  status: "CONFIRMED",
  priceCzk,
  startsOn: new Date(Date.UTC(2027, 6, 10 + number * 7)),
  endsOn: new Date(Date.UTC(2027, 6, 16 + number * 7)),
  paymentPeriodStartedAt: null,
  payments: paidCzk
    ? [
        {
          id: `p${number}`,
          receiptId: `r${number}`,
          correctsReceiptId: null,
          isSummary: false,
          cancelledAt: null,
          amountCzk: paidCzk,
          recordedByName: "Eva",
          createdAt: new Date(Date.UTC(2027, 2, number)),
        },
      ]
    : [],
})

const application = (terms: PaymentTerm[]): PaymentApplication => ({
  id: "a1",
  eventId: "e1",
  eventName: "Camp",
  paymentPeriodDays: 10,
  bankAccount: "123456789/0800",
  number: 12,
  firstName: "Adam",
  lastName: "Test",
  accommodationRequest: null,
  birthDate: new Date("2011-05-04"),
  gender: "MALE",
  email: "eva.mala@example.cz",
  terms,
})

describe("paymentSummary refund", () => {
  it("uses the event payment period for the renewed deadline and hides it after settlement", () => {
    const indebted = term("t1", 1, 4900, 500)
    indebted.paymentPeriodStartedAt = new Date("2026-10-31T12:30:00Z")
    const input = { ...application([indebted]), paymentPeriodDays: 7 }
    expect(paymentSummary(input).terms[0].paymentDueAt).toEqual(new Date("2026-11-07T12:30:00Z"))
    indebted.payments[0]!.amountCzk = 4900
    expect(paymentSummary(input).terms[0].paymentDueAt).toBeNull()
  })

  it("keeps corrected original values in history but excludes them from debt", () => {
    const original = term("t1", 1, 4900, 500)
    original.payments[0]!.cancelledAt = new Date(Date.UTC(2027, 2, 2))
    original.payments.push({
      id: "p-new",
      receiptId: "r-new",
      correctsReceiptId: "r1",
      isSummary: false,
      cancelledAt: null,
      amountCzk: 700,
      recordedByName: "Eva",
      createdAt: new Date(Date.UTC(2027, 2, 2)),
    })
    const summary = paymentSummary(application([original]))
    expect(summary.terms[0].paidCzk).toBe(700)
    expect(summary.terms[0].owedCzk).toBe(4200)
    expect(
      summary.receipts.map((receipt) => [
        receipt.amountCzk,
        receipt.cancelledAt !== null,
        receipt.correctsReceiptId,
      ]),
    ).toEqual([
      [500, true, null],
      [700, false, "r1"],
    ])
    // Removing the replacement must preserve the correction trail as well.
    original.payments[1]!.cancelledAt = new Date(Date.UTC(2027, 2, 3))
    const removed = paymentSummary(application([original]))
    expect(removed.terms[0].paidCzk).toBe(0)
    expect(removed.receipts).toHaveLength(2)
    expect(removed.receipts[1].correctsReceiptId).toBe("r1")
  })

  it("offers no refund without an overpayment", () => {
    const summary = paymentSummary(application([term("t1", 1, 4900, 4900), term("t2", 2, 5600, 0)]))
    expect(summary.refundableTermId).toBeNull()
    expect(summary.terms.map((item) => item.refundableCzk)).toEqual([0, 0])
  })

  it("limits the refund of a term by its own overpayment", () => {
    const summary = paymentSummary(application([term("t1", 1, 4900, 5400), term("t2", 2, 5600, 0)]))
    expect(summary.refundableTermId).toBe("t1")
    expect(summary.terms.map((item) => item.refundableCzk)).toEqual([500, 0])
  })

  it("does not set an overpaid term off against a debt of another term", () => {
    const summary = paymentSummary(
      application([term("t1", 1, 4900, 5400), term("t2", 2, 5600, 100)]),
    )
    expect(summary.terms.find((item) => item.termId === "t1")?.refundableCzk).toBe(500)
    expect(summary.terms.find((item) => item.termId === "t2")?.refundableCzk).toBe(0)
  })

  it("names the most overpaid term first", () => {
    const summary = paymentSummary(
      application([term("t1", 1, 4900, 5100), term("t2", 2, 5600, 6600)]),
    )
    expect(summary.refundableTermId).toBe("t2")
    expect(summary.terms.map((item) => item.refundableCzk)).toEqual([200, 1000])
  })
})
