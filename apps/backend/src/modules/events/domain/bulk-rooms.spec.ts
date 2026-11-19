import { planBulkRooms } from "@/modules/events/domain/bulk-rooms"

describe("planBulkRooms", () => {
  it("numbers shared rooms one after another from the first number", () => {
    expect(planBulkRooms({ count: 2, capacity: 4, firstNumber: 7 }, "SHARED")).toEqual([
      { name: "7", capacity: 4, gender: null },
      { name: "8", capacity: 4, gender: null },
    ])
  })

  it("continues the numbering across genders, women's rooms first", () => {
    expect(
      planBulkRooms({ countFemale: 2, countMale: 1, capacity: 3, firstNumber: 101 }, "GENDERED"),
    ).toEqual([
      { name: "101", capacity: 3, gender: "FEMALE" },
      { name: "102", capacity: 3, gender: "FEMALE" },
      { name: "103", capacity: 3, gender: "MALE" },
    ])
  })

  it("takes a missing gender count as zero", () => {
    expect(planBulkRooms({ countMale: 1, capacity: 2, firstNumber: 5 }, "GENDERED")).toEqual([
      { name: "5", capacity: 2, gender: "MALE" },
    ])
  })

  it("rejects counts that do not fit the room mode", () => {
    expect(planBulkRooms({ countFemale: 1, capacity: 2, firstNumber: 1 }, "SHARED")).toBeNull()
    expect(planBulkRooms({ capacity: 2, firstNumber: 1 }, "SHARED")).toBeNull()
    expect(planBulkRooms({ count: 1, capacity: 2, firstNumber: 1 }, "GENDERED")).toBeNull()
  })

  it("limits the sum of one request to 1–200 rooms", () => {
    const base = { capacity: 1, firstNumber: 1 }
    expect(planBulkRooms({ ...base, countFemale: 0, countMale: 0 }, "GENDERED")).toBeNull()
    expect(planBulkRooms({ ...base, countFemale: 100, countMale: 101 }, "GENDERED")).toBeNull()
    expect(planBulkRooms({ ...base, countFemale: 100, countMale: 100 }, "GENDERED")).toHaveLength(
      200,
    )
    expect(planBulkRooms({ ...base, count: 201 }, "SHARED")).toBeNull()
  })
})
