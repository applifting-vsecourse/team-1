import { isOpenForApplications, missingForApplications } from "./public-event"

describe("missingForApplications", () => {
  it("lists nothing when every term has a room", () => {
    expect(
      missingForApplications({ termCount: 2, termsWithoutRooms: 0, evaluationModePending: false }),
    ).toEqual([])
  })

  it("lists everything for an empty setup, in the order the organizer fixes it", () => {
    expect(
      missingForApplications({ termCount: 0, termsWithoutRooms: 0, evaluationModePending: false }),
    ).toEqual(["TERM"])
    expect(
      missingForApplications({ termCount: 1, termsWithoutRooms: 1, evaluationModePending: false }),
    ).toEqual(["ROOM"])
    expect(
      missingForApplications({ termCount: 0, termsWithoutRooms: 0, evaluationModePending: true }),
    ).toEqual(["TERM", "EVALUATION_MODE"])
  })

  it("lists the evaluation mode while the organizer has not chosen it (US-560)", () => {
    expect(
      missingForApplications({ termCount: 2, termsWithoutRooms: 0, evaluationModePending: true }),
    ).toEqual(["EVALUATION_MODE"])
  })
})

describe("isOpenForApplications", () => {
  it("is open when every term has a room", () => {
    expect(
      isOpenForApplications({ termCount: 2, termsWithoutRooms: 0, evaluationModePending: false }),
    ).toBe(true)
  })

  it("is closed while the evaluation mode is not chosen (US-560)", () => {
    expect(
      isOpenForApplications({ termCount: 2, termsWithoutRooms: 0, evaluationModePending: true }),
    ).toBe(false)
  })

  it("is closed without a term", () => {
    expect(
      isOpenForApplications({ termCount: 0, termsWithoutRooms: 0, evaluationModePending: false }),
    ).toBe(false)
  })

  it("is closed while one term has no room, e.g. right after a term was added (US-99)", () => {
    expect(
      isOpenForApplications({ termCount: 2, termsWithoutRooms: 1, evaluationModePending: false }),
    ).toBe(false)
  })
})
