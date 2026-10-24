import { buildSubmissionStatus, SubmissionRecord } from "./submission-status"

const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`)
const term = (id: string, status: "CONFIRMED" | "WAITLISTED", start: string, priceCzk = 4500) => ({
  termId: id,
  name: id,
  startsOn: day(start),
  endsOn: day(start),
  status,
  priceCzk,
})

const record = (overrides: Partial<SubmissionRecord> = {}): SubmissionRecord => ({
  eventName: "Letní kemp 2027",
  bankAccount: "2900123456/2010",
  email: "jana@example.com",
  mustSetPassword: true,
  applications: [
    {
      number: 48,
      firstName: "Jana",
      lastName: "Nováková",
      terms: [term("t1", "CONFIRMED", "2027-07-04", 6900)],
      payments: [],
    },
    {
      number: 49,
      firstName: "Matěj",
      lastName: "Novák",
      terms: [term("t3", "CONFIRMED", "2027-08-02", 7400), term("t2", "WAITLISTED", "2027-07-19")],
      payments: [],
    },
  ],
  ...overrides,
})

describe("buildSubmissionStatus", () => {
  it("gives every application with a confirmed term its own amount and variable symbol", () => {
    const status = buildSubmissionStatus(record())

    expect(status.isNewAccount).toBe(true)
    expect(status.applications.map((a) => a.payment)).toEqual([
      { bankAccount: "2900123456/2010", variableSymbol: "0048", amountCzk: 6900 },
      { bankAccount: "2900123456/2010", variableSymbol: "0049", amountCzk: 7400 },
    ])
    expect(status.applications.map((a) => a.code)).toEqual(["LK-0048", "LK-0049"])
  })

  it("lists the terms by date and shows a waitlisted term only as such, without a place in line", () => {
    const [, matej] = buildSubmissionStatus(record()).applications

    expect(matej.terms.map((t) => [t.termId, t.status])).toEqual([
      ["t2", "WAITLISTED"],
      ["t3", "CONFIRMED"],
    ])
    expect(JSON.stringify(matej)).not.toMatch(/position|queue/i)
  })

  it("shows no payment for an application waitlisted in every term", () => {
    const base = record()
    const status = buildSubmissionStatus({
      ...base,
      applications: [
        base.applications[0],
        { ...base.applications[1], terms: [term("t2", "WAITLISTED", "2027-07-19")] },
      ],
    })

    expect(status.applications[0].payment).not.toBeNull()
    expect(status.applications[1].payment).toBeNull()
    expect(status.applications[1].paymentStatus).toBe("NOTHING_DUE")
  })

  it("asks for what is still unpaid, never a negative amount, and reports the payment status", () => {
    const base = record()
    const [partly, overpaid] = buildSubmissionStatus({
      ...base,
      mustSetPassword: false,
      applications: [
        { ...base.applications[0], payments: [{ amountCzk: 1000 }] },
        { ...base.applications[0], number: 50, payments: [{ amountCzk: 10000 }] },
      ],
    }).applications

    expect(partly.payment?.amountCzk).toBe(5900)
    expect(partly.paymentStatus).toBe("PARTIALLY_PAID")
    expect(overpaid.payment?.amountCzk).toBe(0)
    expect(overpaid.paymentStatus).toBe("OVERPAID")
  })
})
