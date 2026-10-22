import {
  buildMyApplication,
  buildSubmissionStatus,
  MyApplicationRecord,
  toApplicationCode,
  toVariableSymbol,
} from "./my-application"

const at = (minute: number): Date => new Date(Date.UTC(2027, 0, 1, 10, minute))
const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`)

const record = (overrides: Partial<MyApplicationRecord> = {}): MyApplicationRecord => ({
  id: "a1",
  number: 48,
  submittedAt: at(5),
  firstName: "Jana",
  lastName: "Nováková",
  eventName: "Letní kemp 2027",
  bankAccount: "2900123456/2010",
  terms: [
    {
      termId: "t2",
      name: "2. týden",
      startsOn: day("2027-07-11"),
      endsOn: day("2027-07-17"),
      status: "CONFIRMED",
      priceCzk: 4900,
    },
    {
      termId: "t1",
      name: "1. týden",
      startsOn: day("2027-07-04"),
      endsOn: day("2027-07-10"),
      status: "CONFIRMED",
      priceCzk: 4500,
    },
  ],
  payments: [],
  ...overrides,
})

describe("toVariableSymbol", () => {
  it("pads the application number to four digits", () => {
    expect(toVariableSymbol(48)).toBe("0048")
    expect(toVariableSymbol(1234)).toBe("1234")
    expect(toVariableSymbol(12345)).toBe("12345")
  })
})

describe("toApplicationCode", () => {
  it("joins the initials of the event words with the padded number", () => {
    expect(toApplicationCode("Letní kemp Lipno 2027", 48)).toBe("LKL-0048")
    expect(toApplicationCode("Horský víkend 2027", 5)).toBe("HV-0005")
  })

  it("drops diacritics and numbers, and falls back to P", () => {
    expect(toApplicationCode("Škola žije", 1)).toBe("SZ-0001")
    expect(toApplicationCode("2027", 7)).toBe("P-0007")
  })
})

describe("buildMyApplication", () => {
  it("sorts terms by date and sums only confirmed terms as amount due", () => {
    const result = buildMyApplication(record())

    expect(result.terms.map((term) => term.termId)).toEqual(["t1", "t2"])
    expect(result.amountDueCzk).toBe(9400)
    expect(result.variableSymbol).toBe("0048")
    expect(result.paymentDetails).toEqual({
      bankAccount: "2900123456/2010",
      variableSymbol: "0048",
    })
  })

  it.each([
    ["nothing paid", [], 0, 9400, "UNPAID"],
    ["partly paid", [{ amountCzk: 2000 }], 2000, 7400, "PARTIALLY_PAID"],
    ["fully paid", [{ amountCzk: 9400 }], 9400, 0, "PAID"],
    ["paid in two parts", [{ amountCzk: 4000 }, { amountCzk: 5400 }], 9400, 0, "PAID"],
    ["overpaid", [{ amountCzk: 10000 }], 10000, -600, "OVERPAID"],
  ])("%s", (_name, payments, paid, owed, status) => {
    const result = buildMyApplication(record({ payments }))

    expect(result.amountPaidCzk).toBe(paid)
    expect(result.amountOwedCzk).toBe(owed)
    expect(result.paymentStatus).toBe(status)
  })

  it("charges only the confirmed term and never reveals a place in line", () => {
    const base = record()
    const result = buildMyApplication(
      record({ terms: [base.terms[1], { ...base.terms[0], status: "WAITLISTED" }] }),
    )

    expect(result.amountDueCzk).toBe(4500)
    expect(result.terms.map((term) => term.status)).toEqual(["CONFIRMED", "WAITLISTED"])
    expect(result.terms[1]).not.toHaveProperty("waitlistPosition")
    expect(result.paymentDetails).not.toBeNull()
  })

  it("shows no payment details when every term is waitlisted", () => {
    const base = record()
    const result = buildMyApplication(
      record({ terms: base.terms.map((term) => ({ ...term, status: "WAITLISTED" as const })) }),
    )

    expect(result.amountDueCzk).toBe(0)
    expect(result.paymentDetails).toBeNull()
    expect(result.paymentStatus).toBe("NOTHING_DUE")
  })
})

describe("buildSubmissionStatus", () => {
  const waitlisted = (r: MyApplicationRecord): MyApplicationRecord => ({
    ...r,
    terms: r.terms.map((term) => ({ ...term, status: "WAITLISTED" as const })),
  })
  const submission = (applications: MyApplicationRecord[], mustSetPassword = true) => ({
    email: "jana@example.com",
    mustSetPassword,
    applications,
  })

  it("adds up what is due for confirmed terms of every participant, with one variable symbol", () => {
    const jana = record({ id: "a1", number: 48, firstName: "Jana" })
    const matej = record({ id: "a2", number: 49, firstName: "Matěj" })

    const status = buildSubmissionStatus(submission([jana, matej]))

    expect(status.code).toBe("LK-0048")
    expect(status.isNewAccount).toBe(true)
    expect(status.payment).toEqual({
      amountCzk: 18800,
      bankAccount: "2900123456/2010",
      variableSymbol: "0048",
      parts: [
        { firstName: "Jana", amountCzk: 9400 },
        { firstName: "Matěj", amountCzk: 9400 },
      ],
    })
  })

  it("leaves out a participant who is waitlisted everywhere and takes the symbol of the first payer", () => {
    const jana = waitlisted(record({ id: "a1", number: 48, firstName: "Jana" }))
    const matej = record({ id: "a2", number: 49, firstName: "Matěj" })

    const { payment } = buildSubmissionStatus(submission([jana, matej], false))

    expect(payment?.variableSymbol).toBe("0049")
    expect(payment?.parts.map((part) => part.firstName)).toEqual(["Matěj"])
  })

  it("shows no payment when every term of every participant is waitlisted", () => {
    const status = buildSubmissionStatus(
      submission([
        waitlisted(record({ number: 48 })),
        waitlisted(record({ id: "a2", number: 49 })),
      ]),
    )

    expect(status.payment).toBeNull()
    expect(JSON.stringify(status)).not.toMatch(/position|queue/i)
  })

  it("asks for what is still unpaid, never a negative amount", () => {
    const status = buildSubmissionStatus(
      submission([record({ payments: [{ amountCzk: 10000 }] })], false),
    )

    expect(status.isNewAccount).toBe(false)
    expect(status.payment?.amountCzk).toBe(0)
  })
})
