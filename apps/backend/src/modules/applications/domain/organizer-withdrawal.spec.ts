import { previewWithdrawal, rejectWithdrawal } from "./organizer-withdrawal"

const confirmed = (termId: string, priceCzk: number, paidCzk: number) => ({
  termId,
  status: "CONFIRMED" as const,
  priceCzk,
  paidCzk,
})

describe("previewWithdrawal", () => {
  it("turns the payment of a withdrawn term into an overpayment and leaves the other term as is", () => {
    const impact = previewWithdrawal({
      current: [confirmed("t1", 4900, 4900), confirmed("t2", 3000, 1000)],
      withdrawnIds: ["t1"],
    })
    expect(impact.terms[0]).toMatchObject({
      isWithdrawn: true,
      paidCzk: 4900,
      debtCzk: 0,
      overpaymentCzk: 4900,
    })
    expect(impact.terms[1]).toMatchObject({
      isWithdrawn: false,
      paidCzk: 1000,
      debtCzk: 2000,
      overpaymentCzk: 0,
    })
    expect(impact.overpaymentCzk).toBe(4900)
  })

  it("has no debt and no overpayment in an unpaid withdrawn term", () => {
    const impact = previewWithdrawal({
      current: [confirmed("t1", 3000, 0)],
      withdrawnIds: ["t1"],
    })
    expect(impact.terms[0]).toMatchObject({ debtCzk: 0, overpaymentCzk: 0 })
    expect(impact.overpaymentCzk).toBe(0)
  })

  it("withdraws from all terms", () => {
    const impact = previewWithdrawal({
      current: [confirmed("t1", 4900, 4900), confirmed("t2", 3000, 0)],
      withdrawnIds: ["t1", "t2"],
    })
    expect(impact.terms.every((term) => term.isWithdrawn && term.debtCzk === 0)).toBe(true)
    expect(impact.overpaymentCzk).toBe(4900)
  })

  it("marks a waitlisted term as one without a financial impact", () => {
    const impact = previewWithdrawal({
      current: [{ termId: "t1", status: "WAITLISTED", priceCzk: 3000, paidCzk: 0 }],
      withdrawnIds: ["t1"],
    })
    expect(impact.terms[0]).toMatchObject({ hasFinancialImpact: false, debtCzk: 0 })
  })

  it("keeps an overpaid term that stays overpaid", () => {
    const impact = previewWithdrawal({
      current: [confirmed("t1", 1000, 1500), confirmed("t2", 2000, 0)],
      withdrawnIds: ["t2"],
    })
    expect(impact.terms[0].overpaymentCzk).toBe(500)
    expect(impact.overpaymentCzk).toBe(500)
  })
})

describe("rejectWithdrawal", () => {
  it("rejects an empty selection and a term the application is not in", () => {
    expect(rejectWithdrawal(["t1"], [])).toBe("NOTHING_SELECTED")
    expect(rejectWithdrawal(["t1"], ["t2"])).toBe("TERM_NOT_ACTIVE")
    expect(rejectWithdrawal(["t1", "t2"], ["t2"])).toBeNull()
  })
})
