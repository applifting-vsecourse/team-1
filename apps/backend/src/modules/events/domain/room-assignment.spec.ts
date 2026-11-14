import { computeFreeRoomBeds } from "@/modules/applications/domain/capacity"
import { isAssignable } from "@/modules/applications/domain/evaluation"
import { findSameNamedRoom, rejectAssignment } from "@/modules/events/domain/room-assignment"

describe("isAssignable", () => {
  it("allows confirmed and to-evaluate, not waitlisted or cancelled", () => {
    expect(isAssignable("CONFIRMED")).toBe(true)
    expect(isAssignable("TO_EVALUATE")).toBe(true)
    expect(isAssignable("WAITLISTED")).toBe(false)
    expect(isAssignable("CANCELLED")).toBe(false)
  })
})

describe("computeFreeRoomBeds", () => {
  it("counts own and extra beds", () => {
    expect(computeFreeRoomBeds({ capacity: 2, extraBeds: 1 }, 2)).toBe(1)
    expect(computeFreeRoomBeds({ capacity: 2, extraBeds: 0 }, 2)).toBe(0)
  })
})

describe("rejectAssignment", () => {
  const room = { capacity: 2, extraBeds: 0 }

  it("accepts a free bed", () => {
    expect(
      rejectAssignment({ status: "CONFIRMED", room, assignedCount: 1, alreadyInRoom: false }),
    ).toBeNull()
  })

  it("rejects a full room", () => {
    expect(
      rejectAssignment({ status: "CONFIRMED", room, assignedCount: 2, alreadyInRoom: false }),
    ).toBe("ROOM_FULL")
  })

  it("counts an extra bed as a free bed", () => {
    expect(
      rejectAssignment({
        status: "TO_EVALUATE",
        room: { capacity: 2, extraBeds: 1 },
        assignedCount: 2,
        alreadyInRoom: false,
      }),
    ).toBeNull()
  })

  it("rejects a status that cannot be assigned", () => {
    expect(
      rejectAssignment({ status: "WAITLISTED", room, assignedCount: 0, alreadyInRoom: false }),
    ).toBe("ROOM_ASSIGNMENT_STATUS_INVALID")
  })

  it("treats staying in the same full room as a no-op", () => {
    expect(
      rejectAssignment({ status: "CONFIRMED", room, assignedCount: 2, alreadyInRoom: true }),
    ).toBeNull()
  })
})

describe("findSameNamedRoom", () => {
  const rooms = [{ name: "Pokoj 101" }, { name: "Pokoj 103" }]

  it("matches the name regardless of case and surrounding space", () => {
    expect(findSameNamedRoom(rooms, " pokoj 103 ")).toBe(rooms[1])
  })

  it("returns undefined without a room of that name", () => {
    expect(findSameNamedRoom(rooms, "Pokoj 999")).toBeUndefined()
  })
})
