import {
  buildMyApplication,
  MyApplicationRecord,
  toApplicationCode,
  toVariableSymbol,
  WaitlistedArrival,
  waitlistPosition,
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

const noQueues = new Map<string, WaitlistedArrival[]>()

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

describe("waitlistPosition", () => {
  it("is one more than the applications that arrived earlier", () => {
    const self = { submittedAt: at(5), number: 3 }
    const queue = [
      { submittedAt: at(1), number: 1 },
      { submittedAt: at(5), number: 3 },
      { submittedAt: at(9), number: 7 },
    ]
    expect(waitlistPosition(self, queue)).toBe(2)
  })

  it("breaks a tie of arrival time by the application number", () => {
    const queue = [
      { submittedAt: at(5), number: 2 },
      { submittedAt: at(5), number: 4 },
    ]
    expect(waitlistPosition({ submittedAt: at(5), number: 3 }, queue)).toBe(2)
  })
})

describe("buildMyApplication", () => {
  it("sorts terms by date and sums only confirmed terms as amount due", () => {
    const result = buildMyApplication(record(), noQueues)

    expect(result.terms.map((term) => term.termId)).toEqual(["t1", "t2"])
    expect(result.amountDueCzk).toBe(9400)
    expect(result.variableSymbol).toBe("0048")
    expect(result.paymentDetails).toEqual({
      bankAccount: "2900123456/2010",
      variableSymbol: "0048",
    })
  })

  it.each([
    ["nothing paid", [], 0, 9400],
    ["partly paid", [{ amountCzk: 2000 }], 2000, 7400],
    ["fully paid", [{ amountCzk: 9400 }], 9400, 0],
    ["paid in two parts", [{ amountCzk: 4000 }, { amountCzk: 5400 }], 9400, 0],
    ["overpaid", [{ amountCzk: 10000 }], 10000, -600],
  ])("%s", (_name, payments, paid, owed) => {
    const result = buildMyApplication(record({ payments }), noQueues)

    expect(result.amountPaidCzk).toBe(paid)
    expect(result.amountOwedCzk).toBe(owed)
  })

  it("charges only the confirmed term and gives the waitlisted one its place", () => {
    const base = record()
    const queues = new Map<string, WaitlistedArrival[]>([
      [
        "t2",
        [
          { submittedAt: at(1), number: 40 },
          { submittedAt: at(5), number: 48 },
        ],
      ],
    ])
    const result = buildMyApplication(
      record({ terms: [base.terms[1], { ...base.terms[0], status: "WAITLISTED" }] }),
      queues,
    )

    expect(result.amountDueCzk).toBe(4500)
    expect(result.terms[0]).toMatchObject({ status: "CONFIRMED", waitlistPosition: null })
    expect(result.terms[1]).toMatchObject({ status: "WAITLISTED", waitlistPosition: 2 })
    expect(result.paymentDetails).not.toBeNull()
  })

  it("shows no payment details when every term is waitlisted", () => {
    const base = record()
    const result = buildMyApplication(
      record({ terms: base.terms.map((term) => ({ ...term, status: "WAITLISTED" as const })) }),
      new Map(),
    )

    expect(result.amountDueCzk).toBe(0)
    expect(result.paymentDetails).toBeNull()
    expect(result.terms.every((term) => term.waitlistPosition === 1)).toBe(true)
  })
})
