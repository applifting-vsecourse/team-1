import {
  canChangeManually,
  changeEmailKind,
  exceedsCapacityWhenConfirmed,
  manualTargets,
} from "./status-transition"

describe("manual status transitions (US-28)", () => {
  it("lets the organizer confirm or cancel a waitlisted application", () => {
    expect(manualTargets("WAITLISTED")).toEqual(["CONFIRMED", "CANCELLED"])
  })

  it("lets the organizer cancel a confirmed application, but not move it back to the waitlist", () => {
    expect(canChangeManually("CONFIRMED", "CANCELLED")).toBe(true)
    expect(canChangeManually("CONFIRMED", "WAITLISTED")).toBe(false)
  })

  it("treats a cancelled application as terminal", () => {
    expect(manualTargets("CANCELLED")).toEqual([])
    expect(canChangeManually("CANCELLED", "CONFIRMED")).toBe(false)
  })

  it("does not allow a change to the same status", () => {
    expect(canChangeManually("CONFIRMED", "CONFIRMED")).toBe(false)
    expect(canChangeManually("WAITLISTED", "WAITLISTED")).toBe(false)
  })
})

describe("exceedsCapacityWhenConfirmed", () => {
  it("is false while a bed of the gender is free", () => {
    expect(exceedsCapacityWhenConfirmed("FEMALE", { FEMALE: 1, MALE: 0 })).toBe(false)
  })

  it("is true when no bed of the gender is free, also when already overbooked", () => {
    expect(exceedsCapacityWhenConfirmed("MALE", { FEMALE: 3, MALE: 0 })).toBe(true)
    expect(exceedsCapacityWhenConfirmed("MALE", { FEMALE: 3, MALE: -2 })).toBe(true)
  })
})

describe("changeEmailKind", () => {
  it("maps the new status to the kind of e-mail", () => {
    expect(changeEmailKind("CONFIRMED")).toBe("STATUS_CHANGED")
    expect(changeEmailKind("WAITLISTED")).toBe("WAITLISTED")
    expect(changeEmailKind("CANCELLED")).toBe("REJECTED")
  })
})
