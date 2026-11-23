import { createRoomWishEvaluator, isWishableStatus } from "./room-wish-status"

const birch = { id: "birch-204", name: "Bříza 204" }
const oak = { id: "oak-101", name: "Dub 101" }

describe("createRoomWishEvaluator", () => {
  const author = { applicationTermId: "jana", room: birch }
  const eva = { applicationTermId: "eva", firstName: "Eva", lastName: "Černá", room: birch }
  const tereza = { applicationTermId: "tereza", firstName: "Tereza", lastName: "Malá", room: oak }
  const ondrej = { applicationTermId: "ondrej", firstName: "Ondřej", lastName: "Bílý", room: null }
  const jana = { ...author, firstName: "Jana", lastName: "Nováková" }

  it("uses full normalized names in either order and keeps the original text", () => {
    const evaluate = createRoomWishEvaluator([eva, tereza, ondrej, jana])
    expect(
      evaluate(
        [" ČERNÁ  eva ", "Tereza Mala", "Ondrej Bily", "Teresa Malá", "Jana Nováková"],
        author,
      ),
    ).toEqual([
      { name: " ČERNÁ  eva ", status: "fulfilled", roomName: birch.name },
      { name: "Tereza Mala", status: "unfulfilled", roomName: oak.name },
      { name: "Ondrej Bily", status: "unfulfilled", roomName: null },
      { name: "Teresa Malá", status: "impossible", roomName: null },
      { name: "Jana Nováková", status: "impossible", roomName: null },
    ])
  })

  it("keeps a same-room match with a namesake and does not infer a room from ambiguous matches elsewhere", () => {
    const evaluate = createRoomWishEvaluator([
      eva,
      { ...eva, applicationTermId: "namesake", room: oak },
    ])
    expect(evaluate(["Eva Černá"], author)).toEqual([
      { name: "Eva Černá", status: "fulfilled", roomName: birch.name },
    ])
    expect(evaluate(["Eva Černá"], { ...author, room: null })).toEqual([
      { name: "Eva Černá", status: "unfulfilled", roomName: null },
    ])
  })
})

describe("isWishableStatus", () => {
  it("counts only applications that can sleep in a room (open business question)", () => {
    expect(["CONFIRMED", "TO_EVALUATE"].every((s) => isWishableStatus(s as never))).toBe(true)
    expect(["WAITLISTED", "CANCELLED", "ARCHIVED"].some((s) => isWishableStatus(s as never))).toBe(
      false,
    )
  })
})
