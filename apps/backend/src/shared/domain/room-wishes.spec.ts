import { cleanRoomWishes, evaluateRoomWishes } from "@/shared/domain/room-wishes"

describe("cleanRoomWishes", () => {
  it("trims, drops blanks and repeats and keeps three", () => {
    expect(cleanRoomWishes(["  Eva  Černá ", "", "eva černá", "Klára", "Tereza", "Jana"])).toEqual([
      "Eva Černá",
      "Klára",
      "Tereza",
    ])
  })
})

describe("evaluateRoomWishes", () => {
  const roommates = [
    { firstName: "Eva", lastName: "Černá" },
    { firstName: "Klára", lastName: "Veselá" },
  ]

  it("matches full names regardless of case, diacritics and order", () => {
    expect(evaluateRoomWishes(["eva cerna", "Veselá Klára", "Tereza Malá"], roommates)).toEqual([
      { name: "eva cerna", fulfilled: true },
      { name: "Veselá Klára", fulfilled: true },
      { name: "Tereza Malá", fulfilled: false },
    ])
  })

  it("does not match a first name alone", () => {
    expect(evaluateRoomWishes(["Eva"], roommates)).toEqual([{ name: "Eva", fulfilled: false }])
  })

  it("has nothing to fulfil without roommates", () => {
    expect(evaluateRoomWishes(["Eva Černá"], [])).toEqual([{ name: "Eva Černá", fulfilled: false }])
  })
})
