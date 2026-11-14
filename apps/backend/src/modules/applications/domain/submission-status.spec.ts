import { buildSubmissionStatus, SubmissionRecord } from "./submission-status"

const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`)
const term = (id: string, status: "CONFIRMED" | "WAITLISTED", start: string, priceCzk = 4500) => ({
  termId: id,
  name: id,
  startsOn: day(start),
  endsOn: day(start),
  status,
  priceCzk,
  termNumber: Number(id.slice(1)),
  payments: [] as { amountCzk: number }[],
})

const record = (overrides: Partial<SubmissionRecord> = {}): SubmissionRecord => ({
  eventName: "Letní kemp 2027",
  bankAccount: "2900123456/2010",
  email: "jana@example.com",
  mustSetPassword: true,
  applications: [
    {
      id: "app-48",
      number: 48,
      firstName: "Jana",
      lastName: "Nováková",
      terms: [term("t1", "CONFIRMED", "2027-07-04", 6900)],
    },
    {
      id: "app-49",
      number: 49,
      firstName: "Matěj",
      lastName: "Novák",
      terms: [term("t3", "CONFIRMED", "2027-08-02", 7400), term("t2", "WAITLISTED", "2027-07-19")],
    },
  ],
  ...overrides,
})

const paidApplication = (
  application: SubmissionRecord["applications"][number],
  number: number,
  amountCzk: number,
): SubmissionRecord["applications"][number] => ({
  ...application,
  number,
  terms: application.terms.map((t) => ({ ...t, payments: [{ amountCzk }] })),
})

describe("buildSubmissionStatus", () => {
  it("gives every application with a confirmed term its own amount and variable symbol", () => {
    const status = buildSubmissionStatus(record())

    expect(status.isNewAccount).toBe(true)
    expect(status.applications.map((a) => a.payment)).toMatchObject([
      { bankAccount: "2900123456/2010", summary: { variableSymbol: "48000", payableCzk: 6900 } },
      { bankAccount: "2900123456/2010", summary: { variableSymbol: "49000", payableCzk: 7400 } },
    ])
    expect(status.applications.map((a) => a.code)).toEqual(["LK-0048", "LK-0049"])
    expect(status.applications.map((a) => a.id)).toEqual(["app-48", "app-49"])
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
        paidApplication(base.applications[0], 48, 1000),
        paidApplication(base.applications[0], 50, 10000),
      ],
    }).applications

    expect(partly.payment?.summary.payableCzk).toBe(5900)
    expect(partly.paymentStatus).toBe("PARTIALLY_PAID")
    expect(overpaid.payment?.summary.payableCzk).toBe(0)
    expect(overpaid.paymentStatus).toBe("OVERPAID")
  })

  it("gives the summary and a variable symbol per confirmed term (US-137)", () => {
    const [, matej] = buildSubmissionStatus(record()).applications

    // t2 is waitlisted, so only the confirmed t3 gets a symbol.
    expect(matej.payment?.summary).toEqual({ variableSymbol: "49000", payableCzk: 7400 })
    expect(matej.payment?.terms).toMatchObject([
      { termId: "t3", variableSymbol: "49003", dueCzk: 7400, owedCzk: 7400 },
    ])
  })

  it("asks for the debt of a term although another one is overpaid (D-088)", () => {
    const base = record()
    const application = {
      ...base.applications[0],
      terms: [
        { ...term("t1", "CONFIRMED", "2027-07-04", 1000), payments: [{ amountCzk: 1500 }] },
        term("t2", "CONFIRMED", "2027-08-01", 700),
      ],
    }
    const [result] = buildSubmissionStatus({ ...base, applications: [application] }).applications

    expect(result.payment?.summary.payableCzk).toBe(700)
    // The application summary is still due − paid = 1700 − 1500.
    expect(result.paymentStatus).toBe("PARTIALLY_PAID")
  })
})
