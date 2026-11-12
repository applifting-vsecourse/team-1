import {
  allocatePayment,
  computeAmountDue,
  computeAmountOwed,
  computeAmountPaid,
  computePayableAmount,
  computePaymentStatus,
  computeSelectionPrice,
  computeTermDue,
  computeTermOwed,
  computeTermPaid,
  computeTermPaymentStatus,
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

  it("an omitted amount settles only what remains after earlier receipts", () => {
    expect(resolvePaymentAmount(undefined, 6900, 3000)).toBe(3900)
    expect(resolvePaymentAmount(1000, 6900, 3000)).toBe(1000)
    expect(resolvePaymentAmount(undefined, 6900, 6900)).toBe(0)
    expect(resolvePaymentAmount(undefined, 6900, 7000)).toBe(0)
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

describe("per term (PVT)", () => {
  const confirmed = { status: "CONFIRMED" as const, priceCzk: 700 }
  const waitlisted = { status: "WAITLISTED" as const, priceCzk: 700 }

  it("a waitlisted term owes nothing", () => {
    expect(computeTermDue(waitlisted)).toBe(0)
    expect(computeTermOwed(waitlisted, [])).toBe(0)
    expect(computeTermPaymentStatus(waitlisted, [])).toBe("NOTHING_DUE")
  })

  it("a term to evaluate owes nothing (US-102)", () => {
    expect(computeTermDue({ status: "TO_EVALUATE", priceCzk: 4500 })).toBe(0)
    expect(computeAmountDue([{ status: "TO_EVALUATE", priceCzk: 4500 }])).toBe(0)
  })

  it("a confirmed term without a payment is unpaid", () => {
    expect(computeTermOwed(confirmed, [])).toBe(700)
    expect(computeTermPaymentStatus(confirmed, [])).toBe("UNPAID")
  })

  it("tracks partial, full and over payment", () => {
    expect(computeTermPaymentStatus(confirmed, [{ amountCzk: 200 }])).toBe("PARTIALLY_PAID")
    expect(computeTermPaymentStatus(confirmed, [{ amountCzk: 700 }])).toBe("PAID")
    expect(computeTermOwed(confirmed, [{ amountCzk: 900 }])).toBe(-200)
    expect(computeTermPaymentStatus(confirmed, [{ amountCzk: 900 }])).toBe("OVERPAID")
  })

  it("a refund lowers paid", () => {
    expect(computeTermPaid([{ amountCzk: 900 }, { amountCzk: -200 }])).toBe(700)
  })

  it("one term paid, the second one confirmed later: the debt lands only on the second (US-110)", () => {
    const firstPayments = [{ amountCzk: 4900 }]
    const first = { status: "CONFIRMED" as const, priceCzk: 4900 }
    const secondWaitlisted = { status: "WAITLISTED" as const, priceCzk: 5600 }
    const secondConfirmed = { status: "CONFIRMED" as const, priceCzk: 5600 }

    // While the second term is a substitute, nothing is owed anywhere.
    expect(computeTermOwed(first, firstPayments)).toBe(0)
    expect(computeTermOwed(secondWaitlisted, [])).toBe(0)

    // Once it is confirmed, the first term stays paid and only the second has a debt.
    expect(computeTermPaymentStatus(first, firstPayments)).toBe("PAID")
    expect(computeTermOwed(first, firstPayments)).toBe(0)
    expect(computeTermPaymentStatus(secondConfirmed, [])).toBe("UNPAID")
    expect(computeTermOwed(secondConfirmed, [])).toBe(5600)
    expect(
      computePayableAmount([
        computeTermOwed(first, firstPayments),
        computeTermOwed(secondConfirmed, []),
      ]),
    ).toBe(5600)
  })

  it("two terms with a part-paid debt each show the debt per term (500 + 700 CZK)", () => {
    const first = { status: "CONFIRMED" as const, priceCzk: 4900 }
    const second = { status: "CONFIRMED" as const, priceCzk: 5600 }
    const firstOwed = computeTermOwed(first, [{ amountCzk: 4400 }])
    const secondOwed = computeTermOwed(second, [{ amountCzk: 4900 }])
    expect([firstOwed, secondOwed]).toEqual([500, 700])
    expect(computePayableAmount([firstOwed, secondOwed])).toBe(1200)
  })

  it("the application summary equals the sum over its terms", () => {
    const terms = [
      { term: { status: "CONFIRMED" as const, priceCzk: 500 }, payments: [{ amountCzk: 500 }] },
      { term: waitlisted, payments: [] },
    ]
    const owed = terms.reduce((sum, t) => sum + computeTermOwed(t.term, t.payments), 0)
    expect(owed).toBe(
      computeAmountOwed(
        computeAmountDue(terms.map((t) => t.term)),
        computeAmountPaid(terms.flatMap((t) => t.payments)),
      ),
    )
  })
})

describe("computePayableAmount", () => {
  it("ignores an overpayment of one term when another has a debt", () => {
    expect(computePayableAmount([-300, 700])).toBe(700)
  })
  it("is zero when nothing is owed", () => {
    expect(computePayableAmount([0, -100])).toBe(0)
  })
})

describe("allocatePayment", () => {
  const term = (id: string, day: number, number: number, owedCzk: number, confirmed = true) => ({
    applicationTermId: id,
    status: confirmed ? ("CONFIRMED" as const) : ("WAITLISTED" as const),
    startsOn: new Date(Date.UTC(2027, 6, day)),
    termNumber: number,
    owedCzk,
  })

  it("pays the earliest term first, exactly", () => {
    expect(allocatePayment(1200, [term("b", 20, 2, 700), term("a", 5, 1, 500)])).toEqual([
      { applicationTermId: "a", amountCzk: 500 },
      { applicationTermId: "b", amountCzk: 700 },
    ])
  })

  it("leaves a shortfall on the latest term", () => {
    expect(allocatePayment(600, [term("a", 5, 1, 500), term("b", 20, 2, 700)])).toEqual([
      { applicationTermId: "a", amountCzk: 500 },
      { applicationTermId: "b", amountCzk: 100 },
    ])
  })

  it("puts an overpayment on the last confirmed term", () => {
    expect(allocatePayment(1500, [term("a", 5, 1, 500), term("b", 20, 2, 700)])).toEqual([
      { applicationTermId: "a", amountCzk: 500 },
      { applicationTermId: "b", amountCzk: 1000 },
    ])
  })

  it("breaks a date tie by term number", () => {
    expect(allocatePayment(100, [term("b", 5, 2, 500), term("a", 5, 1, 500)])).toEqual([
      { applicationTermId: "a", amountCzk: 100 },
    ])
  })

  it("skips waitlisted terms and terms without a debt", () => {
    expect(
      allocatePayment(300, [
        term("a", 5, 1, 0),
        term("w", 6, 2, 700, false),
        term("b", 20, 3, 700),
      ]),
    ).toEqual([{ applicationTermId: "b", amountCzk: 300 }])
  })

  it("with no confirmed term the overpayment goes on the last term", () => {
    expect(allocatePayment(400, [term("w1", 5, 1, 0, false), term("w2", 20, 2, 0, false)])).toEqual(
      [{ applicationTermId: "w2", amountCzk: 400 }],
    )
  })

  it("an overpayment on a fully paid confirmed term lands on the last confirmed one", () => {
    expect(allocatePayment(100, [term("a", 5, 1, 0), term("b", 20, 2, 0)])).toEqual([
      { applicationTermId: "b", amountCzk: 100 },
    ])
  })

  it("returns nothing without terms or amount", () => {
    expect(allocatePayment(100, [])).toEqual([])
    expect(allocatePayment(0, [term("a", 5, 1, 500)])).toEqual([])
  })
})

describe("archived paid terms (US-109)", () => {
  it("preserves the amount due instead of turning the paid price into an overpayment", () => {
    const archived = { status: "ARCHIVED" as const, priceCzk: 1000 }
    expect(computeAmountDue([archived])).toBe(1000)
    expect(computeTermDue(archived)).toBe(1000)
    expect(computeTermOwed(archived, [{ amountCzk: 1000 }])).toBe(0)
    expect(computeTermPaymentStatus(archived, [{ amountCzk: 1000 }])).toBe("PAID")
    expect(computeTermPaymentStatus(archived, [{ amountCzk: 1100 }])).toBe("OVERPAID")
  })
})
