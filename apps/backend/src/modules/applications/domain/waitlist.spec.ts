import { Gender } from "@/shared/domain/gender"
import { bedGroup, WaitlistCandidate, waitlistKey, waitlistPositions } from "./waitlist"

let counter = 0
const candidate = (
  overrides: Partial<WaitlistCandidate> & { gender?: Gender; minute: number },
): WaitlistCandidate => {
  counter += 1
  return {
    applicationId: `a${counter}`,
    termId: "t1",
    gender: "FEMALE",
    status: "WAITLISTED",
    submittedAt: new Date(2027, 1, 7, 20, overrides.minute),
    number: counter,
    ...overrides,
  }
}

describe("waitlist positions", () => {
  it("numbers waitlisted applications per bed group in order of receipt", () => {
    const late = candidate({ minute: 30 })
    const early = candidate({ minute: 1 })
    const man = candidate({ minute: 5, gender: "MALE" })
    const positions = waitlistPositions([late, man, early], "GENDERED")
    expect(positions.get(waitlistKey(early.applicationId, "t1"))).toBe(1)
    expect(positions.get(waitlistKey(late.applicationId, "t1"))).toBe(2)
    expect(positions.get(waitlistKey(man.applicationId, "t1"))).toBe(1)
  })

  it("keeps one queue for both genders in shared rooms", () => {
    const woman = candidate({ minute: 1 })
    const man = candidate({ minute: 2, gender: "MALE" })
    const positions = waitlistPositions([man, woman], "SHARED")
    expect(positions.get(waitlistKey(woman.applicationId, "t1"))).toBe(1)
    expect(positions.get(waitlistKey(man.applicationId, "t1"))).toBe(2)
  })

  it("keeps a separate queue per term", () => {
    const first = candidate({ minute: 1 })
    const other = candidate({ minute: 2, termId: "t2" })
    const positions = waitlistPositions([first, other], "GENDERED")
    expect(positions.get(waitlistKey(other.applicationId, "t2"))).toBe(1)
  })

  it("drops confirmed and cancelled applications and moves the rest up", () => {
    const confirmed = candidate({ minute: 1, status: "CONFIRMED" })
    const cancelled = candidate({ minute: 2, status: "CANCELLED" })
    const waiting = candidate({ minute: 3 })
    const positions = waitlistPositions([confirmed, cancelled, waiting], "GENDERED")
    expect(positions.size).toBe(1)
    expect(positions.get(waitlistKey(waiting.applicationId, "t1"))).toBe(1)
  })

  it("breaks ties by application number", () => {
    const a = candidate({ minute: 4, number: 9 })
    const b = candidate({ minute: 4, number: 8 })
    const positions = waitlistPositions([a, b], "GENDERED")
    expect(positions.get(waitlistKey(b.applicationId, "t1"))).toBe(1)
  })

  it("maps a gender to its bed group", () => {
    expect(bedGroup("GENDERED", "MALE")).toBe("MALE")
    expect(bedGroup("SHARED", "MALE")).toBe("SHARED")
  })
})
