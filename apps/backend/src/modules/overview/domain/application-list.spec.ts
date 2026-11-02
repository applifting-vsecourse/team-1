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
      roomMode: "GENDERED" as const,
      status: "CONFIRMED",
      priceCzk: 1000,
      termNumber: 1,
      payments: [{ amountCzk: 400 }],
    },
    {
      id: "t2",
      name: "Second",
      startsOn: new Date(),
      endsOn: new Date(),
      roomMode: "GENDERED" as const,
      status: "WAITLISTED",
      priceCzk: 2000,
      termNumber: 2,
      payments: [],
    },
  ],
}

describe("application list filters", () => {
  it.each(["jana", "TEST JANA", "  jana   test  ", "TEST@EXAMPLE", "48000", "48", "  "])(
    "finds names, e-mails and variable symbols: %s",
    (q) => {
      expect(applicationList([row], { q })).toHaveLength(1)
    },
  )
  it("ignores accents, combines search with filters and does not expose internal numbers", () => {
    const accented = { ...row, firstName: "Šárka", lastName: "Černá" }
    expect(
      applicationList([accented], { q: "cerna SARKA", payment: "PARTIALLY_PAID" }),
    ).toHaveLength(1)
    expect(applicationList([accented], { q: "cerna", gender: "MALE" })).toEqual([])
    expect(applicationList([row], { q: "nobody" })).toEqual([])
    expect(applicationList([row], { q: "48000", payment: "PAID" })).toEqual([])
    expect(applicationList([row], { q: "48000" })[0]).not.toHaveProperty("number")
  })
  it("matches term and status on the same term and preserves every term and total", () => {
    expect(applicationList([row], { termId: "t2", status: "CONFIRMED" })).toEqual([])
    expect(
      applicationList([row], {
        termId: "t2",
        status: "WAITLISTED",
        payment: "PARTIALLY_PAID",
        gender: "FEMALE",
      })[0],
    ).toMatchObject({
      amountDueCzk: 1000,
      amountPaidCzk: 400,
      amountOwedCzk: 600,
      terms: [
        expect.objectContaining({ id: "t1", priceCzk: 1000, waitlistPosition: null }),
        expect.objectContaining({ id: "t2", priceCzk: 2000, waitlistPosition: 1 }),
      ],
    })
    expect(applicationList([row], { gender: "MALE" })).toEqual([])
  })
  it("filters by each payment status using the whole balance including refunds", () => {
    const paidWith = (payments: { amountCzk: number }[]): ListedApplication => ({
      ...row,
      terms: row.terms.map((term, i) => (i === 0 ? { ...term, payments } : term)),
    })
    const paid = paidWith([{ amountCzk: 1500 }, { amountCzk: -500 }])
    const overpaid = paidWith([{ amountCzk: 1500 }])
    const unpaid = paidWith([])
    expect(applicationList([paid], { payment: "PAID" })[0].paymentStatus).toBe("PAID")
    expect(applicationList([paid], { payment: "PARTIALLY_PAID" })).toEqual([])
    expect(applicationList([overpaid], { payment: "OVERPAID" })[0].amountOwedCzk).toBe(-500)
    expect(applicationList([overpaid], { payment: "PAID" })).toEqual([])
    expect(applicationList([unpaid], { payment: "UNPAID" })).toHaveLength(1)
    expect(applicationList([row], { payment: "UNPAID" })).toEqual([])
  })
  it("does not label waitlisted-only applications with any payment status", () => {
    const waiting = { ...row, terms: [row.terms[1]] }
    for (const payment of ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"] as const)
      expect(applicationList([waiting], { payment })).toEqual([])
    expect(applicationList([waiting], {})[0].paymentStatus).toBe("NOTHING_DUE")
  })
})

describe("waitlist in the application list (US-30)", () => {
  const waiting = (id: string, gender: "FEMALE" | "MALE", minute: number, number: number) => ({
    ...row,
    id,
    number,
    gender,
    submittedAt: new Date(2027, 1, 7, 20, minute),
    terms: [{ ...row.terms[1] }],
  })
  const queue = [
    waiting("late-woman", "FEMALE", 9, 5),
    waiting("man", "MALE", 2, 3),
    waiting("early-woman", "FEMALE", 1, 2),
  ]
  const filters = { termId: "t2", status: "WAITLISTED" as const }

  it("orders a term's waitlist by bed group, then by receipt, with the place in the group", () => {
    const entries = applicationList(queue, filters)
    expect(entries.map((entry) => entry.id)).toEqual(["early-woman", "late-woman", "man"])
    expect(entries.map((entry) => entry.terms[0].waitlistPosition)).toEqual([1, 2, 1])
  })
  it("keeps the place when the list is filtered by gender", () => {
    const entries = applicationList(queue, { ...filters, gender: "FEMALE" })
    expect(entries.map((entry) => entry.terms[0].waitlistPosition)).toEqual([1, 2])
    const afterSearch = applicationList(queue, { ...filters, q: "late" })
    expect(afterSearch).toEqual([])
  })
  it("counts both genders in one queue in shared rooms", () => {
    const sharedQueue = queue.map((entry) => ({
      ...entry,
      terms: [{ ...entry.terms[0], roomMode: "SHARED" as const }],
    }))
    const entries = applicationList(sharedQueue, filters)
    expect(entries.map((entry) => entry.id)).toEqual(["early-woman", "man", "late-woman"])
    expect(entries.map((entry) => entry.terms[0].waitlistPosition)).toEqual([1, 2, 3])
  })
  it("gives no place to confirmed and cancelled terms", () => {
    const entry = applicationList([row], {})[0]
    expect(entry.terms.map((term) => term.waitlistPosition)).toEqual([null, 1])
    const cancelled = { ...row, terms: [{ ...row.terms[1], status: "CANCELLED" as const }] }
    expect(applicationList([cancelled], {})[0].terms[0].waitlistPosition).toBeNull()
  })
})
