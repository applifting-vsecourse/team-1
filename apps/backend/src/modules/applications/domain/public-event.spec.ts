import { isOpenForApplications } from "./public-event"

describe("isOpenForApplications", () => {
  it("is open with a term and a room", () => {
    expect(isOpenForApplications({ termCount: 1, roomCount: 1 })).toBe(true)
  })

  it("is closed without a term", () => {
    expect(isOpenForApplications({ termCount: 0, roomCount: 3 })).toBe(false)
  })

  it("is closed without a room", () => {
    expect(isOpenForApplications({ termCount: 2, roomCount: 0 })).toBe(false)
  })
})
