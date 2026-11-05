import { skippedSubstitutes } from "@/modules/applications/domain/substitute-skips"
import { RoomMode, WaitlistCandidate } from "@/modules/applications/domain/waitlist"

const at = (minute: number) => new Date(Date.UTC(2027, 0, 1, 10, minute))

function candidate(
  id: string,
  minute: number,
  gender: "MALE" | "FEMALE",
  roomMode: RoomMode = "GENDERED",
  termId = "t1",
): WaitlistCandidate {
  return {
    applicationId: id,
    termId,
    roomMode,
    gender,
    status: "WAITLISTED",
    submittedAt: at(minute),
    number: minute,
  }
}

describe("skippedSubstitutes", () => {
  const queue = [
    candidate("a", 1, "MALE"),
    candidate("b", 2, "MALE"),
    candidate("c", 3, "MALE"),
    candidate("d", 4, "MALE"),
  ]

  it("skips nobody when the first in the order is confirmed", () => {
    expect(skippedSubstitutes({ applicationId: "a", termId: "t1" }, queue)).toEqual([])
  })

  it("skips the two ahead when the third is confirmed, in order", () => {
    expect(skippedSubstitutes({ applicationId: "c", termId: "t1" }, queue)).toEqual(["a", "b"])
  })

  it("does not skip those behind the confirmed one", () => {
    expect(skippedSubstitutes({ applicationId: "b", termId: "t1" }, queue)).toEqual(["a"])
  })

  it("keeps a queue per gender in gendered rooms", () => {
    const mixed = [
      candidate("m1", 1, "MALE"),
      candidate("f1", 2, "FEMALE"),
      candidate("f2", 3, "FEMALE"),
      candidate("m2", 4, "MALE"),
    ]
    expect(skippedSubstitutes({ applicationId: "f2", termId: "t1" }, mixed)).toEqual(["f1"])
    expect(skippedSubstitutes({ applicationId: "m2", termId: "t1" }, mixed)).toEqual(["m1"])
  })

  it("has one common queue in shared rooms (D-063)", () => {
    const shared = [
      candidate("m1", 1, "MALE", "SHARED"),
      candidate("f1", 2, "FEMALE", "SHARED"),
      candidate("m2", 3, "MALE", "SHARED"),
    ]
    expect(skippedSubstitutes({ applicationId: "m2", termId: "t1" }, shared)).toEqual(["m1", "f1"])
  })

  it("ignores other terms", () => {
    const other = [candidate("x", 1, "MALE", "GENDERED", "t2"), candidate("a", 2, "MALE")]
    expect(skippedSubstitutes({ applicationId: "a", termId: "t1" }, other)).toEqual([])
  })

  it("breaks a tie of the receipt time by the application number", () => {
    const tie = [
      { ...candidate("late", 5, "MALE"), submittedAt: at(1), number: 9 },
      { ...candidate("early", 5, "MALE"), submittedAt: at(1), number: 3 },
    ]
    expect(skippedSubstitutes({ applicationId: "late", termId: "t1" }, tie)).toEqual(["early"])
  })

  it("skips nobody when the confirmed one is not on the waitlist", () => {
    expect(skippedSubstitutes({ applicationId: "zzz", termId: "t1" }, queue)).toEqual([])
  })
})
