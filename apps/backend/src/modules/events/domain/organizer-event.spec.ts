import { StoredEvent, toOrganizerEvent } from "./organizer-event"

const stored: StoredEvent = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Letní kemp z. s.",
  name: "Letní kemp 2027",
  description: null,
  location: null,
  publicToken: "token",
  createdAt: new Date("2027-01-01T10:00:00Z"),
  termCount: 0,
  termsWithoutRooms: 0,
  applicationCount: 0,
  evaluationMode: "AUTOMATIC",
  startsOn: null,
  endsOn: null,
  terms: [],
}

describe("toOrganizerEvent", () => {
  it("reports a new event as closed and lists what is missing", () => {
    expect(toOrganizerEvent(stored)).toMatchObject({
      applicationsOpen: false,
      missing: ["TERM"],
    })
  })

  it("opens the application link once every term has a room", () => {
    expect(toOrganizerEvent({ ...stored, termCount: 2, termsWithoutRooms: 0 })).toMatchObject({
      applicationsOpen: true,
      missing: [],
    })
  })

  it("closes the link again while a newly added term has no room (US-99)", () => {
    expect(toOrganizerEvent({ ...stored, termCount: 2, termsWithoutRooms: 1 })).toMatchObject({
      applicationsOpen: false,
      missing: ["ROOM"],
    })
  })

  it("locks the evaluation mode once the application link works", () => {
    expect(toOrganizerEvent(stored).evaluationModeLocked).toBe(false)
    expect(
      toOrganizerEvent({ ...stored, termCount: 1, termsWithoutRooms: 0 }).evaluationModeLocked,
    ).toBe(true)
  })
})
