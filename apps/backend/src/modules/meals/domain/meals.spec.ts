import {
  decideOptions,
  decideSelection,
  KitchenPerson,
  kitchenSummary,
  MEAL_OPTIONS_MAX,
} from "@/modules/meals/domain/meals"

const veg = { id: "veg", name: "Vegetarian" }
const gf = { id: "gf", name: "Gluten-free" }

const person = (over: Partial<KitchenPerson>): KitchenPerson => ({
  applicationId: "a",
  firstName: "Adam",
  lastName: "Dvořák",
  optionIds: [],
  allergies: null,
  specialRequest: null,
  ...over,
})
const term = (people: KitchenPerson[]) => ({
  termId: "t1",
  name: null,
  startsOn: new Date("2027-07-12"),
  endsOn: new Date("2027-07-19"),
  people,
})

describe("decideOptions", () => {
  it("trims names and keeps ids", () => {
    expect(decideOptions([{ id: "x", name: "  Vegan " }, { name: "Halal" }])).toEqual({
      kind: "ok",
      options: [
        { id: "x", name: "Vegan" },
        { id: undefined, name: "Halal" },
      ],
    })
  })

  it("refuses blank, repeated (case-insensitive) and too many options", () => {
    expect(decideOptions([{ name: "  " }]).kind).toBe("invalid")
    expect(decideOptions([{ name: "Vegan" }, { name: "vegan" }]).kind).toBe("invalid")
    const many = Array.from({ length: MEAL_OPTIONS_MAX + 1 }, (_, i) => ({ name: `o${i}` }))
    expect(decideOptions(many).kind).toBe("invalid")
  })

  it("accepts an empty list", () => {
    expect(decideOptions([])).toEqual({ kind: "ok", options: [] })
  })
})

describe("decideSelection", () => {
  it("accepts offered options once and trims the allergies", () => {
    expect(
      decideSelection(
        { optionIds: ["veg", "veg"], allergies: "  peanuts ", specialRequest: " late arrival " },
        [veg, gf],
      ),
    ).toEqual({
      kind: "ok",
      optionIds: ["veg"],
      allergies: "peanuts",
      specialRequest: "late arrival",
    })
  })

  it("clears empty allergies and refuses unknown options", () => {
    expect(decideSelection({ optionIds: [], allergies: "  ", specialRequest: "" }, [veg])).toEqual({
      kind: "ok",
      optionIds: [],
      allergies: null,
      specialRequest: null,
    })
    expect(
      decideSelection({ optionIds: ["other"], allergies: "", specialRequest: "" }, [veg]).kind,
    ).toBe("invalid")
    expect(
      decideSelection({ optionIds: [], allergies: "", specialRequest: "x".repeat(1001) }, [veg])
        .kind,
    ).toBe("invalid")
  })
})

describe("kitchenSummary", () => {
  it("counts regular meals, overlapping options and lists allergies by name", () => {
    const [summary] = kitchenSummary(
      [
        term([
          person({ applicationId: "1" }),
          person({ applicationId: "2", optionIds: ["veg"] }),
          person({ applicationId: "3", optionIds: ["veg", "gf"], allergies: "Milk" }),
          person({ applicationId: "4", lastName: "Adamová", allergies: "Peanuts" }),
          person({ applicationId: "5", lastName: "Zelená", specialRequest: "Early dinner" }),
        ]),
      ],
      [veg, gf],
    )
    expect(summary).toMatchObject({ total: 5, regular: 3 })
    expect(summary!.options).toEqual([
      { ...veg, count: 2 },
      { ...gf, count: 1 },
    ])
    expect(summary!.allergies.map((entry) => entry.applicationId)).toEqual(["4", "3"])
    expect(summary!.specialRequests.map((entry) => entry.applicationId)).toEqual(["5"])
  })

  it("is empty for a term without confirmed participants", () => {
    const [summary] = kitchenSummary([term([])], [veg])
    expect(summary).toMatchObject({ total: 0, regular: 0, allergies: [], specialRequests: [] })
  })
})
