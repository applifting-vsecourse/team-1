import { isApplicationEditable } from "@/modules/applications/domain/application-editable"

const today = new Date("2027-07-15T00:00:00.000Z")
const term = (status: string, endsOn: string) => ({ status, endsOn: new Date(endsOn) })

describe("isApplicationEditable", () => {
  it("is editable while a term that is not cancelled has not ended", () => {
    expect(isApplicationEditable([term("CONFIRMED", "2027-07-31")], today)).toBe(true)
    expect(isApplicationEditable([term("WAITLISTED", "2027-07-31")], today)).toBe(true)
    expect(isApplicationEditable([term("TO_EVALUATE", "2027-07-31")], today)).toBe(true)
  })

  it("counts the last day of the term as running", () => {
    expect(isApplicationEditable([term("CONFIRMED", "2027-07-15")], today)).toBe(true)
    expect(isApplicationEditable([term("CONFIRMED", "2027-07-14")], today)).toBe(false)
  })

  it("is not editable when every term is cancelled or over", () => {
    expect(isApplicationEditable([term("CANCELLED", "2027-07-31")], today)).toBe(false)
    expect(
      isApplicationEditable(
        [term("CANCELLED", "2027-07-31"), term("CONFIRMED", "2027-07-01")],
        today,
      ),
    ).toBe(false)
  })

  it("is editable when only one of the terms is live", () => {
    expect(
      isApplicationEditable(
        [term("CONFIRMED", "2027-07-01"), term("WAITLISTED", "2027-08-01")],
        today,
      ),
    ).toBe(true)
  })

  it("is not editable without a term", () => {
    expect(isApplicationEditable([], today)).toBe(false)
  })
})
