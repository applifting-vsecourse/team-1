import { buildPaymentDetails, computeApplicationPaid, PaymentTermRecord } from "./payment-details"

const term = (overrides: Partial<PaymentTermRecord>): PaymentTermRecord => ({
  termId: "t1",
  termNumber: 1,
  startsOn: new Date("2027-07-01"),
  status: "CONFIRMED",
  priceCzk: 500,
  payments: [],
  ...overrides,
})

describe("buildPaymentDetails", () => {
  it("is null while no term is confirmed", () => {
    expect(buildPaymentDetails(12345, "1/0100", [term({ status: "WAITLISTED" })])).toBeNull()
  })

  it("gives the summary symbol and a symbol per confirmed term, earliest first", () => {
    const details = buildPaymentDetails(12345, "1/0100", [
      term({ termId: "t2", termNumber: 2, startsOn: new Date("2027-08-01"), priceCzk: 700 }),
      term({ payments: [{ amountCzk: 500 }] }),
      term({ termId: "t3", termNumber: 3, status: "WAITLISTED" }),
    ])
    expect(details).toEqual({
      bankAccount: "1/0100",
      summary: { variableSymbol: "12345000", payableCzk: 700 },
      terms: [
        {
          termId: "t1",
          termNumber: 1,
          variableSymbol: "12345001",
          dueCzk: 500,
          paidCzk: 500,
          owedCzk: 0,
          paymentStatus: "PAID",
          paymentDeadline: null,
        },
        {
          termId: "t2",
          termNumber: 2,
          variableSymbol: "12345002",
          dueCzk: 700,
          paidCzk: 0,
          owedCzk: 700,
          paymentStatus: "UNPAID",
          paymentDeadline: null,
        },
      ],
    })
  })

  it("does not set an overpaid term off against the debt of another (D-088)", () => {
    const terms = [
      term({ payments: [{ amountCzk: 800 }] }),
      term({ termId: "t2", termNumber: 2, startsOn: new Date("2027-08-01"), priceCzk: 700 }),
    ]
    const details = buildPaymentDetails(1, "1/0100", terms)!
    expect(details.summary.payableCzk).toBe(700)
    // …while the application summary stays due − paid = 1200 − 800.
    expect(computeApplicationPaid(terms)).toBe(800)
  })
})
