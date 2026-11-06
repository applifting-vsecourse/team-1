import { buildMyApplication, MyApplicationRecord, toApplicationCode } from "./my-application"

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
  paymentPeriodDays: 10,
  organizationName: "Letní kemp z. s.",
  contactEmail: "info@letni-kemp.example",
  contactPhone: "+420 777 000 003",
  terms: [
    {
      termId: "t2",
      name: "2. týden",
      startsOn: day("2027-07-11"),
      endsOn: day("2027-07-17"),
      status: "CONFIRMED",
      priceCzk: 4900,
      termNumber: 2,
      payments: [],
      confirmedAt: null,
      paymentPeriodStartedAt: null,
    },
    {
      termId: "t1",
      name: "1. týden",
      startsOn: day("2027-07-04"),
      endsOn: day("2027-07-10"),
      status: "CONFIRMED",
      priceCzk: 4500,
      termNumber: 1,
      payments: [],
      confirmedAt: null,
      paymentPeriodStartedAt: null,
    },
  ],
  ...overrides,
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
    expect(result.variableSymbol).toBe("48000")
    expect(result.paymentDetails).toMatchObject({
      bankAccount: "2900123456/2010",
      summary: { variableSymbol: "48000", payableCzk: 9400 },
    })
    expect(result.paymentDetails?.terms.map((t) => [t.termId, t.variableSymbol, t.dueCzk])).toEqual(
      [
        ["t1", "48001", 4500],
        ["t2", "48002", 4900],
      ],
    )
  })

  it("carries the organization name with the contact of the event, as typed", () => {
    expect(buildMyApplication(record()).organizationContact).toEqual({
      name: "Letní kemp z. s.",
      email: "info@letni-kemp.example",
      phone: "+420 777 000 003",
    })
  })

  it("keeps a missing e-mail or phone empty instead of inventing one", () => {
    const result = buildMyApplication(record({ contactEmail: null, contactPhone: null }))

    expect(result.organizationContact).toEqual({
      name: "Letní kemp z. s.",
      email: null,
      phone: null,
    })
  })

  it.each([
    ["nothing paid", [], 0, 9400, "UNPAID"],
    ["partly paid", [{ amountCzk: 2000 }], 2000, 7400, "PARTIALLY_PAID"],
    ["fully paid", [{ amountCzk: 9400 }], 9400, 0, "PAID"],
    ["paid in two parts", [{ amountCzk: 4000 }, { amountCzk: 5400 }], 9400, 0, "PAID"],
    ["overpaid", [{ amountCzk: 10000 }], 10000, -600, "OVERPAID"],
  ])("%s", (_name, payments, paid, owed, status) => {
    const base = record()
    const result = buildMyApplication(
      record({ terms: base.terms.map((term, i) => (i === 0 ? { ...term, payments } : term)) }),
    )

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

  describe("payment deadline (US-41)", () => {
    const withTerm = (overrides: Record<string, unknown>) => {
      const base = record()
      return buildMyApplication(record({ terms: [{ ...base.terms[1], ...overrides }] }))
        .paymentDetails!.terms[0]
    }

    it("counts the period from the confirmation", () => {
      const term = withTerm({ confirmedAt: day("2027-05-01") })
      expect(term.paymentDeadline).toEqual(day("2027-05-11"))
    })

    it("restarts the full period after a correction (US-112)", () => {
      const term = withTerm({
        confirmedAt: day("2027-05-01"),
        paymentPeriodStartedAt: day("2027-05-20"),
      })
      expect(term.paymentDeadline).toEqual(day("2027-05-30"))
    })

    it("is due at once when confirmed inside the window before the term starts (D-099)", () => {
      const term = withTerm({ confirmedAt: day("2027-06-30") })
      expect(term.paymentDeadline).toEqual(day("2027-06-30"))
    })

    it("has no deadline when nothing is owed", () => {
      const term = withTerm({ confirmedAt: day("2027-05-01"), payments: [{ amountCzk: 4500 }] })
      expect(term.owedCzk).toBe(0)
      expect(term.paymentDeadline).toBeNull()
    })

    it("has no deadline for a free term", () => {
      const term = withTerm({ confirmedAt: day("2027-05-01"), priceCzk: 0 })
      expect(term.paymentDeadline).toBeNull()
    })
  })
})
