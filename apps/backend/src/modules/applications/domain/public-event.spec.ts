import { isOpenForApplications, missingForApplications } from "./public-event"

describe("missingForApplications", () => {
  it("lists nothing when every term has a room", () => {
    expect(missingForApplications({ termCount: 2, termsWithoutRooms: 0 })).toEqual([])
  })

  it("lists everything for an empty setup, in the order the organizer fixes it", () => {
    expect(missingForApplications({ termCount: 0, termsWithoutRooms: 0 })).toEqual(["TERM"])
    expect(missingForApplications({ termCount: 1, termsWithoutRooms: 1 })).toEqual(["ROOM"])
  })
})

describe("isOpenForApplications", () => {
  it("is open when every term has a room", () => {
    expect(isOpenForApplications({ termCount: 2, termsWithoutRooms: 0 })).toBe(true)
  })

  it("is closed without a term", () => {
    expect(isOpenForApplications({ termCount: 0, termsWithoutRooms: 0 })).toBe(false)
  })

  it("is closed while one term has no room, e.g. right after a term was added (US-99)", () => {
    expect(isOpenForApplications({ termCount: 2, termsWithoutRooms: 1 })).toBe(false)
  })
})
