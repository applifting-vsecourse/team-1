import { canWriteRoomWishes, canWriteStay } from "./arrangement-rules"

const term = (status: string, termCancelled = false) => ({ status, termCancelled })

describe("arrangement rules", () => {
  it("roommate wishes need a confirmed term that is not cancelled and no individual accommodation", () => {
    expect(canWriteRoomWishes(term("CONFIRMED"), false)).toBe(true)
    expect(canWriteRoomWishes(term("WAITLISTED"), false)).toBe(false)
    expect(canWriteRoomWishes(term("CONFIRMED", true), false)).toBe(false)
    expect(canWriteRoomWishes(term("CONFIRMED"), true)).toBe(false)
  })

  it("the stay can be written until the term is cancelled or archived", () => {
    expect(canWriteStay(term("TO_EVALUATE"))).toBe(true)
    expect(canWriteStay(term("WAITLISTED"))).toBe(true)
    expect(canWriteStay(term("CANCELLED"))).toBe(false)
    expect(canWriteStay(term("ARCHIVED"))).toBe(false)
    expect(canWriteStay(term("CONFIRMED", true))).toBe(false)
  })
})
