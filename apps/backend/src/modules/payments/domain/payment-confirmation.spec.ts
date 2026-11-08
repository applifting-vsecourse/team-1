import { planPaymentConfirmations } from "@/modules/payments/domain/payment-confirmation"

describe("planPaymentConfirmations", () => {
  it("returns a term whose debt was settled exactly", () => {
    expect(
      planPaymentConfirmations([{ id: "a", owedCzk: 500 }], [{ id: "a", owedCzk: 0 }]),
    ).toEqual([{ id: "a", owedCzk: 0 }])
  })

  it("returns a term whose debt was closed with an overpayment", () => {
    expect(
      planPaymentConfirmations([{ id: "a", owedCzk: 500 }], [{ id: "a", owedCzk: -100 }]),
    ).toHaveLength(1)
  })

  it("ignores a payment that only reduces the debt", () => {
    expect(
      planPaymentConfirmations([{ id: "a", owedCzk: 500 }], [{ id: "a", owedCzk: 200 }]),
    ).toEqual([])
  })

  it("ignores a payment onto a term that is already paid or overpaid", () => {
    expect(
      planPaymentConfirmations(
        [
          { id: "a", owedCzk: 0 },
          { id: "b", owedCzk: -50 },
        ],
        [
          { id: "a", owedCzk: -100 },
          { id: "b", owedCzk: -200 },
        ],
      ),
    ).toEqual([])
  })

  it("returns only the terms a summary payment closed", () => {
    const closed = planPaymentConfirmations(
      [
        { id: "a", owedCzk: 300 },
        { id: "b", owedCzk: 400 },
      ],
      [
        { id: "a", owedCzk: 0 },
        { id: "b", owedCzk: 100 },
      ],
    )
    expect(closed.map((term) => term.id)).toEqual(["a"])
  })

  it("ignores a term that was not confirmed before", () => {
    expect(planPaymentConfirmations([], [{ id: "a", owedCzk: 0 }])).toEqual([])
  })
})
