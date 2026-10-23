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
  roomCount: 0,
  startsOn: null,
  endsOn: null,
  terms: [],
}

describe("toOrganizerEvent", () => {
  it("reports a new event as closed and lists what is missing", () => {
    expect(toOrganizerEvent(stored)).toMatchObject({
      applicationsOpen: false,
      missing: ["TERM", "ROOM"],
    })
  })

  it("opens the application link once terms and rooms exist", () => {
    expect(toOrganizerEvent({ ...stored, termCount: 2, roomCount: 3 })).toMatchObject({
      applicationsOpen: true,
      missing: [],
    })
  })
})
