import { isEditWindowOpen, isMealsEditable, isTermEditable } from "./edit-window"

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("edit window (D-192)", () => {
  it("keeps the last day of the term open and closes the day after", () => {
    expect(isEditWindowOpen(day("2027-07-12"), day("2027-07-12"))).toBe(true)
    expect(isEditWindowOpen(day("2027-07-12"), day("2027-07-13"))).toBe(false)
    expect(isEditWindowOpen(day("2027-07-12"), day("2027-07-01"))).toBe(true)
  })

  it("a cancelled term or application in it is never editable", () => {
    const endsOn = day("2027-07-12")
    expect(isTermEditable({ status: "CONFIRMED", endsOn }, day("2027-07-01"))).toBe(true)
    expect(isTermEditable({ status: "CANCELLED", endsOn }, day("2027-07-01"))).toBe(false)
    expect(
      isTermEditable({ status: "CONFIRMED", endsOn, cancelledAt: new Date() }, day("2027-07-01")),
    ).toBe(false)
  })

  it("an unpaid term that is over is closed although it is not archived", () => {
    expect(
      isTermEditable({ status: "CONFIRMED", endsOn: day("2027-07-12") }, day("2027-07-20")),
    ).toBe(false)
  })

  it("meals stay open while any term that is not cancelled is not over", () => {
    const today = day("2027-07-20")
    const over = { status: "CONFIRMED", endsOn: day("2027-07-12") }
    const running = { status: "CONFIRMED", endsOn: day("2027-08-01") }
    const cancelledRunning = { status: "CANCELLED", endsOn: day("2027-08-01") }
    expect(isMealsEditable([over, running], today)).toBe(true)
    expect(isMealsEditable([over, cancelledRunning], today)).toBe(false)
    expect(isMealsEditable([], today)).toBe(false)
  })
})
