import {
  ProposalParticipant,
  ProposalRoom,
  proposeRoomAssignments,
} from "@/modules/events/domain/room-proposal"

const room = (id: string, freeBeds: number, gender: ProposalRoom["gender"], occupants = []) =>
  ({ id, freeBeds, gender, occupants }) satisfies ProposalRoom

let counter = 0
const person = (
  firstName: string,
  lastName: string,
  gender: ProposalParticipant["gender"],
  wishes: string[] = [],
  individualAccommodation = false,
): ProposalParticipant => ({
  applicationTermId: `${firstName}-${lastName}-${(counter += 1)}`,
  firstName,
  lastName,
  gender,
  wishes,
  individualAccommodation,
})

const roomOf = (result: ReturnType<typeof proposeRoomAssignments>, p: ProposalParticipant) =>
  result.placements.find((item) => item.applicationTermId === p.applicationTermId)?.roomId

describe("proposeRoomAssignments", () => {
  it("puts nobody into a room of the other gender or over its beds", () => {
    const girls = [
      person("Anna", "A", "FEMALE"),
      person("Beta", "B", "FEMALE"),
      person("Cora", "C", "FEMALE"),
    ]
    const boys = [person("Dan", "D", "MALE")]
    const result = proposeRoomAssignments({
      rooms: [room("f", 2, "FEMALE"), room("m", 3, "MALE")],
      participants: [...girls, ...boys],
    })
    expect(roomOf(result, boys[0]!)).toBe("m")
    expect(result.placements.filter((item) => item.roomId === "f")).toHaveLength(2)
    expect(result.unplaced).toEqual([
      { applicationTermId: girls[2]!.applicationTermId, reason: "NO_FREE_BED" },
    ])
  })

  it("leaves out people with individual accommodation", () => {
    const solo = person("Lucie", "Veselá", "FEMALE", [], true)
    const result = proposeRoomAssignments({
      rooms: [room("f", 2, "FEMALE")],
      participants: [solo],
    })
    expect(result.placements).toEqual([])
    expect(result.unplaced).toEqual([
      { applicationTermId: solo.applicationTermId, reason: "INDIVIDUAL_ACCOMMODATION" },
    ])
  })

  it("rooms people who wish each other together, in the room that holds them all", () => {
    const eva = person("Eva", "Černá", "FEMALE", ["Jana Nováková"])
    const jana = person("Jana", "Nováková", "FEMALE")
    const filler = person("Zita", "Z", "FEMALE")
    const result = proposeRoomAssignments({
      rooms: [room("big", 3, "FEMALE"), room("pair", 2, "FEMALE")],
      participants: [filler, eva, jana],
    })
    expect(roomOf(result, eva)).toBe(roomOf(result, jana))
    expect(result.wishes).toEqual([
      {
        applicationTermId: eva.applicationTermId,
        name: "Jana Nováková",
        matches: [jana.applicationTermId],
        fulfilled: true,
      },
    ])
  })

  it("matches names in either order, ignoring case and diacritics", () => {
    const a = person("Petr", "Šimek", "MALE", ["simek PETR"])
    const b = person("Petr", "Šimek", "MALE")
    const result = proposeRoomAssignments({ rooms: [room("m", 2, "MALE")], participants: [a, b] })
    expect(result.wishes[0]?.fulfilled).toBe(true)
  })

  it("sends a participant to the room of a wished person who already sleeps there", () => {
    const friend = { applicationTermId: "friend", firstName: "Karel", lastName: "Dvořák" }
    const p = person("Tomáš", "Novotný", "MALE", ["Karel Dvořák"])
    const result = proposeRoomAssignments({
      rooms: [room("empty", 4, "MALE"), room("with-friend", 1, "MALE", [friend] as never)],
      participants: [p],
    })
    expect(roomOf(result, p)).toBe("with-friend")
  })

  it("does not fulfil a wish across genders in gendered rooms and reports it", () => {
    const boy = person("Filip", "Horák", "MALE", ["Barbora Šimková"])
    const girl = person("Barbora", "Šimková", "FEMALE")
    const result = proposeRoomAssignments({
      rooms: [room("m", 2, "MALE"), room("f", 2, "FEMALE")],
      participants: [boy, girl],
    })
    expect(roomOf(result, boy)).toBe("m")
    expect(result.wishes).toEqual([
      {
        applicationTermId: boy.applicationTermId,
        name: "Barbora Šimková",
        matches: [girl.applicationTermId],
        fulfilled: false,
      },
    ])
  })

  it("lets any gender share a room without a gender", () => {
    const boy = person("Filip", "Horák", "MALE", ["Barbora Šimková"])
    const girl = person("Barbora", "Šimková", "FEMALE")
    const result = proposeRoomAssignments({
      rooms: [room("x", 2, null)],
      participants: [boy, girl],
    })
    expect(roomOf(result, boy)).toBe("x")
    expect(roomOf(result, girl)).toBe("x")
  })

  it("splits a group bigger than any room and keeps as many together as it can", () => {
    const group = ["A", "B", "C", "D"].map((n, i, all) =>
      person(n, "G", "MALE", [`${all[(i + 1) % all.length]} G`]),
    )
    const result = proposeRoomAssignments({
      rooms: [room("r1", 2, "MALE"), room("r2", 2, "MALE")],
      participants: group,
    })
    expect(result.placements).toHaveLength(4)
    expect(result.wishes.filter((wish) => wish.fulfilled).length).toBeGreaterThanOrEqual(2)
  })

  it("swaps people between rooms when that fulfils more wishes", () => {
    // Greedy grouping alone would leave one pair split; the swap pass fixes it.
    const a = person("Ad", "X", "MALE", ["Bo X"])
    const b = person("Bo", "X", "MALE")
    const c = person("Cy", "X", "MALE", ["Di X"])
    const d = person("Di", "X", "MALE")
    const result = proposeRoomAssignments({
      rooms: [room("r1", 2, "MALE"), room("r2", 2, "MALE")],
      participants: [a, b, c, d],
    })
    expect(result.wishes.every((wish) => wish.fulfilled)).toBe(true)
  })

  it("is deterministic and never reports a wish of someone without a bed", () => {
    const stranded = person("Zed", "Z", "MALE", ["Nobody Here"])
    const input = { rooms: [room("m", 0, "MALE")], participants: [stranded] }
    expect(proposeRoomAssignments(input)).toEqual(proposeRoomAssignments(input))
    expect(proposeRoomAssignments(input).wishes).toEqual([])
  })

  it("does not count a wish for a name nobody has", () => {
    const p = person("Zed", "Z", "MALE", ["Nobody Here"])
    const result = proposeRoomAssignments({ rooms: [room("m", 1, "MALE")], participants: [p] })
    expect(result.wishes).toEqual([
      {
        applicationTermId: p.applicationTermId,
        name: "Nobody Here",
        matches: [],
        fulfilled: false,
      },
    ])
  })
})
