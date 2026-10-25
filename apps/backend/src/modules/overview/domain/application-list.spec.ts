import { applicationList, ListedApplication } from "./application-list"

const row: ListedApplication = {
  number: 48,
  id: "a1",
  firstName: "Jana",
  lastName: "Test",
  birthDate: new Date("2000-01-01"),
  gender: "FEMALE",
  email: "test@example.com",
  submittedAt: new Date(),
  terms: [
    {
      id: "t1",
      name: "First",
      startsOn: new Date(),
      endsOn: new Date(),
      status: "CONFIRMED",
      priceCzk: 1000,
    },
    {
      id: "t2",
      name: "Second",
      startsOn: new Date(),
      endsOn: new Date(),
      status: "WAITLISTED",
      priceCzk: 2000,
    },
  ],
  payments: [{ amountCzk: 400 }],
}

describe("application list filters", () => {
  it.each(["jana", "TEST JANA", "  jana   test  ", "TEST@EXAMPLE", "0048", "48", "  "])(
    "finds names, e-mails and variable symbols: %s",
    (q) => {
      expect(applicationList([row], { q })).toHaveLength(1)
    },
  )
  it("ignores accents, combines search with filters and does not expose internal numbers", () => {
    const accented = { ...row, firstName: "Šárka", lastName: "Černá" }
    expect(applicationList([accented], { q: "cerna SARKA", paid: "false" })).toHaveLength(1)
    expect(applicationList([accented], { q: "cerna", gender: "MALE" })).toEqual([])
    expect(applicationList([row], { q: "nobody" })).toEqual([])
    expect(applicationList([row], { q: "0048", paid: "true" })).toEqual([])
    expect(applicationList([row], { q: "0048" })[0]).not.toHaveProperty("number")
  })
  it("matches term and status on the same term and preserves every term and total", () => {
    expect(applicationList([row], { termId: "t2", status: "CONFIRMED" })).toEqual([])
    expect(
      applicationList([row], {
        termId: "t2",
        status: "WAITLISTED",
        paid: "false",
        gender: "FEMALE",
      })[0],
    ).toMatchObject({
      amountDueCzk: 1000,
      amountPaidCzk: 400,
      amountOwedCzk: 600,
      terms: row.terms,
    })
    expect(applicationList([row], { gender: "MALE" })).toEqual([])
  })
  it("uses the whole balance including refunds and counts overpayments as settled", () => {
    const paid = { ...row, payments: [{ amountCzk: 1500 }, { amountCzk: -500 }] }
    expect(applicationList([paid], { paid: "true" })[0].paymentStatus).toBe("PAID")
    expect(applicationList([paid], { paid: "false" })).toEqual([])
    expect(
      applicationList([{ ...paid, payments: [{ amountCzk: 1500 }] }], { paid: "true" })[0]
        .amountOwedCzk,
    ).toBe(-500)
  })
  it("does not label waitlisted-only applications as paid or unpaid", () => {
    const waiting = { ...row, terms: [row.terms[1]], payments: [] }
    expect(applicationList([waiting], { paid: "false" })).toEqual([])
    expect(applicationList([waiting], { paid: "true" })).toEqual([])
    expect(applicationList([waiting], {})[0].paymentStatus).toBe("NOTHING_DUE")
  })
})
