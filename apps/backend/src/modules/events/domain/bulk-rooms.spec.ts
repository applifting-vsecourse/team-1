import { planBulkRooms } from "@/modules/events/domain/bulk-rooms"

describe("planBulkRooms", () => {
  it("numbers the rooms one after another from the first number", () => {
    expect(planBulkRooms({ count: 3, capacity: 4, firstNumber: 101 }, "FEMALE")).toEqual([
      { name: "101", capacity: 4, gender: "FEMALE" },
      { name: "102", capacity: 4, gender: "FEMALE" },
      { name: "103", capacity: 4, gender: "FEMALE" },
    ])
  })

  it("creates one room with the first number as its name", () => {
    expect(planBulkRooms({ count: 1, capacity: 2, firstNumber: 7 }, null)).toEqual([
      { name: "7", capacity: 2, gender: null },
    ])
  })
})
