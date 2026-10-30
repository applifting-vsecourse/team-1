import {
  canChangeManually,
  changeEmailKind,
  exceedsCapacityWhenConfirmed,
  manualTargets,
  rejectStatusChange,
  StatusChangeSnapshot,
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

  it("lists exactly the targets that canChangeManually accepts", () => {
    for (const from of ["WAITLISTED", "CONFIRMED", "CANCELLED"] as const) {
      for (const to of ["WAITLISTED", "CONFIRMED", "CANCELLED"] as const) {
        expect(canChangeManually(from, to)).toBe(manualTargets(from).includes(to))
      }
    }
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

describe("rejectStatusChange", () => {
  const snapshot = (overrides: Partial<StatusChangeSnapshot> = {}): StatusChangeSnapshot => ({
    status: "WAITLISTED",
    gender: "FEMALE",
    rooms: [{ capacity: 1, gender: "FEMALE" }],
    confirmedGenders: [],
    ...overrides,
  })

  it("allows a confirmation into a free bed", () => {
    expect(rejectStatusChange(snapshot(), "CONFIRMED", false)).toBeNull()
  })

  it("rejects a confirmation beyond the free beds unless the organizer confirms knowingly", () => {
    const full = snapshot({ confirmedGenders: ["FEMALE"] })
    expect(rejectStatusChange(full, "CONFIRMED", false)).toBe("CAPACITY_EXCEEDED")
    expect(rejectStatusChange(full, "CONFIRMED", true)).toBeNull()
  })

  it("counts shared rooms as one pool for all genders", () => {
    const shared = snapshot({
      rooms: [{ capacity: 1, gender: null }],
      confirmedGenders: ["MALE"],
    })
    expect(rejectStatusChange(shared, "CONFIRMED", false)).toBe("CAPACITY_EXCEEDED")
  })

  it("rejects a change the diagram does not have before looking at capacity", () => {
    expect(rejectStatusChange(snapshot({ status: "CONFIRMED" }), "WAITLISTED", true)).toBe(
      "INVALID_STATUS_TRANSITION",
    )
    expect(rejectStatusChange(snapshot({ status: "CANCELLED" }), "CONFIRMED", true)).toBe(
      "INVALID_STATUS_TRANSITION",
    )
  })

  it("does not check capacity for a cancellation", () => {
    const full = snapshot({ status: "CONFIRMED", confirmedGenders: ["FEMALE", "FEMALE"] })
    expect(rejectStatusChange(full, "CANCELLED", false)).toBeNull()
  })
})
