import { isWaitlistExpired, todayInPrague } from "./waitlist-expiry"

const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`)

describe("todayInPrague", () => {
  it("is the Prague date, which in winter is already the next day at 23:30 UTC", () => {
    expect(todayInPrague(new Date("2027-01-10T23:30:00Z"))).toEqual(day("2027-01-11"))
  })

  it("keeps the previous date in summer until 22:00 UTC", () => {
    expect(todayInPrague(new Date("2027-07-10T21:59:00Z"))).toEqual(day("2027-07-10"))
    expect(todayInPrague(new Date("2027-07-10T22:00:00Z"))).toEqual(day("2027-07-11"))
  })

  it("handles the switch to summer time", () => {
    expect(todayInPrague(new Date("2027-03-27T23:00:00Z"))).toEqual(day("2027-03-28"))
    expect(todayInPrague(new Date("2027-03-28T21:59:00Z"))).toEqual(day("2027-03-28"))
  })
})

describe("isWaitlistExpired", () => {
  it("is false the day before the term starts, even late in the evening", () => {
    expect(isWaitlistExpired(day("2027-08-02"), new Date("2027-08-01T21:59:00Z"))).toBe(false)
  })

  it("is true from midnight Prague on the first day", () => {
    expect(isWaitlistExpired(day("2027-08-02"), new Date("2027-08-01T22:00:00Z"))).toBe(true)
    expect(isWaitlistExpired(day("2027-08-02"), new Date("2027-08-02T12:00:00Z"))).toBe(true)
  })

  it("stays true after the first day, so a missed run catches up", () => {
    expect(isWaitlistExpired(day("2027-08-02"), new Date("2027-08-05T08:00:00Z"))).toBe(true)
  })
})
