import { canArchiveTerm } from "./application-archive"

const term = {
  status: "CONFIRMED" as const,
  priceCzk: 1000,
  endsOn: new Date("2027-07-01"),
  cancelledAt: null,
}
const now = new Date("2027-07-01T22:00:00Z")
const paid = [{ amountCzk: 1000 }]

it("archives from the first instant of the next Prague date, including missed runs", () => {
  expect(canArchiveTerm(term, paid, new Date("2027-07-01T21:59:59Z"))).toBe(false)
  expect(canArchiveTerm(term, paid, now)).toBe(true)
  expect(canArchiveTerm(term, paid, new Date("2027-08-01"))).toBe(true)
})
it("requires settled debt, allows overpayment and zero price", () => {
  expect(canArchiveTerm(term, [], now)).toBe(false)
  expect(canArchiveTerm(term, [{ amountCzk: 999 }], now)).toBe(false)
  expect(canArchiveTerm(term, [{ amountCzk: 1100 }], now)).toBe(true)
  expect(canArchiveTerm({ ...term, priceCzk: 0 }, [], now)).toBe(true)
  expect(canArchiveTerm(term, [...paid, { amountCzk: -1 }], now)).toBe(false)
})
it.each(["CANCELLED", "ARCHIVED", "WAITLISTED", "TO_EVALUATE"] as const)(
  "leaves %s alone",
  (status) => {
    expect(canArchiveTerm({ ...term, status }, paid, now)).toBe(false)
  },
)
it("leaves cancelled event terms alone", () => {
  expect(canArchiveTerm({ ...term, cancelledAt: new Date() }, paid, now)).toBe(false)
})
