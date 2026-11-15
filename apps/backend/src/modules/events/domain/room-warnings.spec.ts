import { computeRoomWarnings, RoomWarningsInput } from "@/modules/events/domain/room-warnings"

const men = { id: "men", capacity: 2, extraBeds: 0, gender: "MALE" as const }
const women = { id: "women", capacity: 2, extraBeds: 0, gender: "FEMALE" as const }
const shared = { id: "shared", capacity: 2, extraBeds: 0, gender: null }

const base = (over: Partial<RoomWarningsInput>): RoomWarningsInput => ({
  rooms: [men, women],
  assignments: [],
  confirmedWithoutRoom: [],
  acknowledgements: [],
  ...over,
})
const at = (
  roomId: string,
  n: number,
  gender: "MALE" | "FEMALE" = "MALE",
  individualAccommodation = false,
) =>
  Array.from({ length: n }, (_, i) => ({
    roomId,
    applicationTermId: `${roomId}-${i}${individualAccommodation ? "-individual" : ""}`,
    gender,
    individualAccommodation,
  }))

describe("computeRoomWarnings", () => {
  it("has no warnings in a term without assignments, even with confirmed people", () => {
    const result = computeRoomWarnings(base({ confirmedWithoutRoom: [{ applicationTermId: "a" }] }))
    expect(result.warnings).toEqual([])
    expect(result.summary).toEqual({ violations: 0, acknowledged: 0, confirmedWithoutBed: 0 })
  })

  it("warns about a confirmed person without a bed once someone is assigned", () => {
    const result = computeRoomWarnings(
      base({ assignments: at("men", 1), confirmedWithoutRoom: [{ applicationTermId: "a" }] }),
    )
    expect(result.warnings).toMatchObject([
      { kind: "CONFIRMED_WITHOUT_BED", applicationTermId: "a", roomId: null },
    ])
    expect(result.summary).toEqual({ violations: 0, acknowledged: 0, confirmedWithoutBed: 1 })
  })

  it("warns about the other gender in a gendered room", () => {
    const result = computeRoomWarnings(
      base({
        assignments: [
          ...at("men", 1),
          ...at("men", 1, "FEMALE").map((a) => ({ ...a, applicationTermId: "w" })),
        ],
      }),
    )
    expect(result.warnings).toMatchObject([{ kind: "MIXED_GENDER", roomId: "men" }])
    expect(result.summary.violations).toBe(1)
  })

  it("does not count an applicant with a request for individual accommodation as mixed gender", () => {
    const result = computeRoomWarnings(
      base({ assignments: [...at("men", 1), ...at("men", 1, "FEMALE", true)] }),
    )
    expect(result.warnings).toEqual([])
    expect(result.summary).toEqual({ violations: 0, acknowledged: 0, confirmedWithoutBed: 0 })
  })

  it("still warns when a person without the request is of the other gender", () => {
    const result = computeRoomWarnings(
      base({
        rooms: [{ ...men, capacity: 4 }],
        assignments: [...at("men", 1), ...at("men", 1, "FEMALE", true), ...at("men", 1, "FEMALE")],
      }),
    )
    expect(result.warnings).toMatchObject([{ kind: "MIXED_GENDER", roomId: "men" }])
  })

  it("keeps a person with the request in the count of beds", () => {
    const result = computeRoomWarnings(
      base({ assignments: [...at("men", 2), ...at("men", 1, "FEMALE", true)] }),
    )
    expect(result.warnings).toMatchObject([{ kind: "OVERCROWDED", roomId: "men" }])
  })

  it("does not watch the gender in rooms without one (shared mode)", () => {
    const result = computeRoomWarnings(
      base({
        rooms: [shared],
        assignments: [...at("shared", 1), ...at("shared", 1, "FEMALE")],
      }),
    )
    expect(result.warnings).toEqual([])
  })

  it("warns about more people than beds, extra beds included", () => {
    const full = base({ assignments: at("men", 3) })
    expect(computeRoomWarnings(full).warnings).toMatchObject([
      { kind: "OVERCROWDED", roomId: "men" },
    ])
    const withExtra = base({ rooms: [{ ...men, extraBeds: 1 }, women], assignments: at("men", 3) })
    expect(computeRoomWarnings(withExtra).warnings).toEqual([])
  })

  it("shows an acknowledged warning muted with its note and does not count it", () => {
    const acknowledgedAt = new Date("2027-01-01T10:00:00Z")
    const result = computeRoomWarnings(
      base({
        assignments: at("men", 3),
        acknowledgements: [
          {
            kind: "OVERCROWDED",
            roomId: "men",
            applicationTermId: null,
            note: "Pán Novák spí v chatě",
            acknowledgedBy: "Eva Malá",
            acknowledgedAt,
          },
        ],
      }),
    )
    expect(result.warnings).toMatchObject([
      {
        kind: "OVERCROWDED",
        acknowledged: true,
        note: "Pán Novák spí v chatě",
        acknowledgedBy: "Eva Malá",
        acknowledgedAt,
      },
    ])
    expect(result.summary).toEqual({ violations: 0, acknowledged: 1, confirmedWithoutBed: 0 })
  })

  it("ignores an acknowledgement whose warning is gone", () => {
    const result = computeRoomWarnings(
      base({
        assignments: at("men", 2),
        acknowledgements: [
          {
            kind: "OVERCROWDED",
            roomId: "men",
            applicationTermId: null,
            note: "x",
            acknowledgedBy: "Eva Malá",
            acknowledgedAt: new Date(),
          },
        ],
      }),
    )
    expect(result.warnings).toEqual([])
    expect(result.summary.acknowledged).toBe(0)
  })
})
