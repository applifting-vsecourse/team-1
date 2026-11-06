import { planPaymentDebtRenewal } from "./payment-debt-renewal"

describe("planPaymentDebtRenewal", () => {
  it("renews only the newly indebted term while reporting all current debts", () => {
    const before = [
      { id: "paid", owedCzk: 0 },
      { id: "owing", owedCzk: 500 },
    ]
    const after = [
      { id: "paid", owedCzk: 200 },
      { id: "owing", owedCzk: 700 },
    ]
    expect(planPaymentDebtRenewal(before, after)).toEqual({
      renewedTermIds: ["paid"],
      indebtedTerms: after,
    })
  })

  it("does not renew or notify when every term already owed money", () => {
    expect(
      planPaymentDebtRenewal([{ id: "owing", owedCzk: 500 }], [{ id: "owing", owedCzk: 700 }]),
    ).toBeNull()
  })

  it("treats an overpaid term crossing into debt as a new debt", () => {
    expect(
      planPaymentDebtRenewal(
        [{ id: "overpaid", owedCzk: -100 }],
        [{ id: "overpaid", owedCzk: 50 }],
      ),
    ).toEqual({
      renewedTermIds: ["overpaid"],
      indebtedTerms: [{ id: "overpaid", owedCzk: 50 }],
    })
    expect(
      planPaymentDebtRenewal([{ id: "overpaid", owedCzk: -100 }], [{ id: "overpaid", owedCzk: 0 }]),
    ).toBeNull()
  })

  it("does not renew for an absent term or a debt without a previously paid term", () => {
    expect(planPaymentDebtRenewal([{ id: "paid", owedCzk: 0 }], [])).toBeNull()
    expect(planPaymentDebtRenewal([], [{ id: "new", owedCzk: 500 }])).toBeNull()
    expect(
      planPaymentDebtRenewal([{ id: "paid", owedCzk: 0 }], [{ id: "paid", owedCzk: 0 }]),
    ).toBeNull()
  })
})
