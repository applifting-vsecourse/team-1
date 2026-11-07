import { evaluateManualSubmission } from "@/modules/applications/domain/manual-submission"

describe("manual application evaluation", () => {
  const choices = [
    { termId: "women", priceCzk: 4900, status: "CONFIRMED" as const },
    { termId: "shared", priceCzk: 5600, status: "WAITLISTED" as const },
  ]

  it("flags a full gendered term but keeps the chosen statuses and prices", () => {
    const result = evaluateManualSubmission(choices, "FEMALE", {
      roomsByTerm: {
        women: [{ capacity: 1, gender: "FEMALE" }],
        shared: [{ capacity: 1, gender: null }],
      },
      confirmedGenders: { women: ["FEMALE"], shared: ["MALE"] },
    })
    expect(result.overCapacity).toEqual(["women"])
    expect(result.terms).toEqual(choices)
  })

  it("uses one pool for shared rooms, across genders", () => {
    const result = evaluateManualSubmission(
      [{ termId: "shared", priceCzk: 5600, status: "CONFIRMED" }],
      "FEMALE",
      {
        roomsByTerm: { shared: [{ capacity: 1, gender: null }] },
        confirmedGenders: { shared: ["MALE"] },
      },
    )
    expect(result.overCapacity).toEqual(["shared"])
  })
})
