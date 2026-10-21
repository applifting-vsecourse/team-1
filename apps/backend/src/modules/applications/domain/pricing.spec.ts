import {
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computePaymentStatus,
  computeSelectionPrice,
  resolvePaymentAmount,
} from "./pricing"

describe("computeSelectionPrice", () => {
  it("sums the ticked terms", () => {
    expect(computeSelectionPrice([4500, 4900])).toBe(9400)
    expect(computeSelectionPrice([])).toBe(0)
  })
})

describe("computeAmountDue", () => {
  it("counts only confirmed terms", () => {
    expect(
      computeAmountDue([
        { status: "CONFIRMED", priceCzk: 4500 },
        { status: "WAITLISTED", priceCzk: 4900 },
      ]),
    ).toBe(4500)
  })

  it("is zero for a participant waitlisted everywhere", () => {
    expect(computeAmountDue([{ status: "WAITLISTED", priceCzk: 4500 }])).toBe(0)
  })
})

describe("payments and debt", () => {
  it("owed = due − paid", () => {
    const paid = computeAmountPaid([{ amountCzk: 2000 }, { amountCzk: 500 }])
    expect(computeAmountOwed(4500, paid)).toBe(2000)
  })

  it("shows an overpayment as a negative debt", () => {
    expect(computeAmountOwed(4500, 5000)).toBe(-500)
  })

  it('"paid" without an amount means the whole amount due', () => {
    expect(resolvePaymentAmount(undefined, 9400)).toBe(9400)
    expect(resolvePaymentAmount(3000, 9400)).toBe(3000)
  })

  it("cancelling the only payment brings the debt back", () => {
    expect(computeAmountOwed(4500, computeAmountPaid([]))).toBe(4500)
  })
})

describe("computePaymentStatus", () => {
  it.each([
    ["nothing confirmed", 0, 0, "NOTHING_DUE"],
    ["nothing paid", 9400, 0, "UNPAID"],
    ["partly paid", 9400, 2000, "PARTIALLY_PAID"],
    ["paid in full", 9400, 9400, "PAID"],
    ["overpaid", 9400, 10000, "OVERPAID"],
    ["paid while nothing is due", 0, 500, "OVERPAID"],
  ])("%s", (_name, due, paid, status) => {
    expect(computePaymentStatus(due, paid)).toBe(status)
  })
})
