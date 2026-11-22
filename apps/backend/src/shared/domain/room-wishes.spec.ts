import { cleanRoomWishes } from "@/shared/domain/room-wishes"

describe("cleanRoomWishes", () => {
  it("trims, drops blanks and repeats and keeps three", () => {
    expect(cleanRoomWishes(["  Eva  Černá ", "", "eva černá", "Klára", "Tereza", "Jana"])).toEqual([
      "Eva Černá",
      "Klára",
      "Tereza",
    ])
  })
})
