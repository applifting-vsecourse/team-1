import { findDuplicate, normalizeName } from "./duplicate-application"

const jan = { firstName: "Jan", lastName: "Novák", birthDate: "2013-03-09" }

describe("normalizeName", () => {
  it("ignores case, diacritics and extra whitespace", () => {
    expect(normalizeName("  ŽLUŤOUČKÝ   Kůň ")).toBe("zlutoucky kun")
  })
})

describe("findDuplicate", () => {
  it("finds a stored participant with the same name and birth date on a selected term", () => {
    const existing = [{ ...jan, firstName: "JAN", lastName: "novak", termId: "t1" }]
    expect(findDuplicate(existing, [{ ...jan, termIds: ["t2", "t1"] }])).toEqual({
      participant: expect.objectContaining(jan),
      termId: "t1",
    })
  })

  it("is not a duplicate on another term, birth date or name", () => {
    const existing = [{ ...jan, termId: "t1" }]
    expect(findDuplicate(existing, [{ ...jan, termIds: ["t2"] }])).toBeNull()
    expect(
      findDuplicate(existing, [{ ...jan, birthDate: "2013-03-10", termIds: ["t1"] }]),
    ).toBeNull()
    expect(findDuplicate(existing, [{ ...jan, firstName: "Petr", termIds: ["t1"] }])).toBeNull()
  })

  it("finds a participant repeated within the submission, on the shared term only", () => {
    expect(
      findDuplicate(
        [],
        [
          { ...jan, termIds: ["t1"] },
          { ...jan, termIds: ["t2"] },
        ],
      ),
    ).toBeNull()
    expect(
      findDuplicate(
        [],
        [
          { ...jan, termIds: ["t1", "t2"] },
          { ...jan, termIds: ["t2"] },
        ],
      ),
    ).toMatchObject({ termId: "t2" })
  })
})
