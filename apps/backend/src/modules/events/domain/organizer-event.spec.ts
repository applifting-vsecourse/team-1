import { StoredEvent, toOrganizerEvent } from "./organizer-event"

const stored: StoredEvent = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Letní kemp z. s.",
  organizationContactEmail: null,
  name: "Letní kemp 2027",
  description: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "token",
  createdAt: new Date("2027-01-01T10:00:00Z"),
  termCount: 0,
  termsWithoutRooms: 0,
  applicationCount: 0,
  evaluationMode: "AUTOMATIC",
  evaluationModePending: false,
  cancellationStartsOn: null,
  cancellationTerms: null,
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

  it("keeps the link closed and lists the mode until the organizer chooses it (US-560)", () => {
    expect(
      toOrganizerEvent({ ...stored, termCount: 2, evaluationModePending: true }),
    ).toMatchObject({
      applicationsOpen: false,
      missing: ["EVALUATION_MODE"],
    })
  })

  it("does not lock the evaluation mode when applications open, only with the first application (D-083)", () => {
    expect(toOrganizerEvent(stored).evaluationModeLocked).toBe(false)
    expect(toOrganizerEvent({ ...stored, termCount: 1, termsWithoutRooms: 0 })).toMatchObject({
      applicationsOpen: true,
      evaluationModeLocked: false,
    })
    expect(
      toOrganizerEvent({ ...stored, termCount: 1, termsWithoutRooms: 0, applicationCount: 1 })
        .evaluationModeLocked,
    ).toBe(true)
  })

  it("keeps the evaluation mode locked after the setup was reduced", () => {
    expect(toOrganizerEvent({ ...stored, applicationCount: 1 }).evaluationModeLocked).toBe(true)
  })
})
