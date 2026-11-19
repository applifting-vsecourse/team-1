import {
  decideOptions,
  decideSelection,
  isMealsDecided,
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
  noRestrictions: false,
  lateArrival: null,
  earlyDeparture: null,
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
      noRestrictions: false,
    })
  })

  it('keeps the "no restriction" confirmation only while nothing is entered', () => {
    expect(
      decideSelection({ optionIds: [], allergies: " ", specialRequest: "", noRestrictions: true }, [
        veg,
      ]),
    ).toMatchObject({ kind: "ok", noRestrictions: true })
    for (const input of [
      { optionIds: ["veg"], allergies: "", specialRequest: "" },
      { optionIds: [], allergies: "Milk", specialRequest: "" },
      { optionIds: [], allergies: "", specialRequest: "Early dinner" },
    ]) {
      expect(decideSelection({ ...input, noRestrictions: true }, [veg]).kind).toBe("invalid")
      // Entering a restriction later (without the flag) cancels the confirmation.
      expect(decideSelection(input, [veg])).toMatchObject({ kind: "ok", noRestrictions: false })
    }
  })

  it("clears empty allergies and refuses unknown options", () => {
    expect(decideSelection({ optionIds: [], allergies: "  ", specialRequest: "" }, [veg])).toEqual({
      kind: "ok",
      optionIds: [],
      allergies: null,
      specialRequest: null,
      noRestrictions: false,
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

  it("counts participants who confirmed having no restriction or did not answer as regular meal", () => {
    const [summary] = kitchenSummary(
      [
        term([
          person({ applicationId: "1" }),
          person({ applicationId: "2", noRestrictions: true }),
          person({ applicationId: "3", optionIds: ["veg"] }),
          person({ applicationId: "4", allergies: "Milk" }),
        ]),
      ],
      [veg],
    )
    expect(summary).toMatchObject({ total: 4, regular: 3 })
  })

  it("lists participants with a later arrival or earlier departure by name, without counting them", () => {
    const [summary] = kitchenSummary(
      [
        term([
          person({ applicationId: "1", lateArrival: "2027-07-13T10:30" }),
          person({ applicationId: "2", lastName: "Adamová", earlyDeparture: "2027-07-18T16:00" }),
          person({ applicationId: "3" }),
        ]),
      ],
      [veg],
    )
    expect(summary!.total).toBe(3)
    expect(summary!.regular).toBe(3)
    expect(summary!.stays).toEqual([
      expect.objectContaining({
        applicationId: "2",
        lateArrival: null,
        earlyDeparture: "2027-07-18T16:00",
      }),
      expect.objectContaining({
        applicationId: "1",
        lateArrival: "2027-07-13T10:30",
        earlyDeparture: null,
      }),
    ])
  })

  it("is empty for a term without confirmed participants", () => {
    const [summary] = kitchenSummary([term([])], [veg])
    expect(summary).toMatchObject({
      total: 0,
      regular: 0,
      allergies: [],
      specialRequests: [],
      stays: [],
    })
  })
})

describe("isMealsDecided", () => {
  const base = { optionIds: [], allergies: null, specialRequest: null, noRestrictions: false }

  it("is false when nothing was entered or confirmed", () => {
    expect(isMealsDecided(base)).toBe(false)
  })

  it.each([
    ["confirmed no restriction", { noRestrictions: true }],
    ["an option", { optionIds: ["veg"] }],
    ["allergies", { allergies: "Peanuts" }],
    ["a special request", { specialRequest: "Early dinner" }],
  ])("is true with %s", (_name, over) => {
    expect(isMealsDecided({ ...base, ...over })).toBe(true)
  })
})
