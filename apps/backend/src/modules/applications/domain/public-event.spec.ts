import { isOpenForApplications, missingForApplications } from "./public-event"

describe("missingForApplications", () => {
  it("lists nothing for a complete setup", () => {
    expect(missingForApplications({ termCount: 1, roomCount: 1 })).toEqual([])
  })

  it("lists everything for an empty setup, in the order the organizer fixes it", () => {
    expect(missingForApplications({ termCount: 0, roomCount: 0 })).toEqual(["TERM", "ROOM"])
  })
})

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
