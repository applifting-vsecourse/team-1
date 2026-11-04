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
  payments: paidCzk
    ? [
        {
          id: `p${number}`,
          receiptId: `r${number}`,
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
  bankAccount: "123456789/0800",
  number: 12,
  firstName: "Adam",
  lastName: "Test",
  terms,
})

describe("paymentSummary refund", () => {
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
