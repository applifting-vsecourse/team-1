import { formatTermDates, termLabel } from "@/modules/applications/domain/term-label"

describe("termLabel", () => {
  const dates = { startsOn: "2027-07-12", endsOn: "2027-07-18" }

  it("is the name of a named term", () => {
    expect(termLabel({ name: "1. týden", ...dates }, "cs")).toBe("1. týden")
  })

  it("is just the dates of a term without a name", () => {
    expect(termLabel({ name: null, ...dates }, "cs")).toBe("12.–18. 7. 2027")
    expect(termLabel({ name: null, ...dates }, "en")).toBe("12–18 Jul 2027")
  })

  it("treats a name of spaces as no name", () => {
    expect(termLabel({ name: "   ", ...dates }, "cs")).toBe("12.–18. 7. 2027")
  })

  it("takes dates from a Date column too", () => {
    expect(
      termLabel(
        {
          name: null,
          startsOn: new Date("2027-07-12T00:00:00Z"),
          endsOn: new Date("2027-07-18T00:00:00Z"),
        },
        "cs",
      ),
    ).toBe("12.–18. 7. 2027")
  })
})

describe("formatTermDates", () => {
  it("spans months and years", () => {
    expect(formatTermDates("2027-07-28", "2027-08-03", "cs")).toBe("28. 7. – 3. 8. 2027")
    expect(formatTermDates("2027-12-28", "2028-01-03", "en")).toBe("28 Dec 2027 – 3 Jan 2028")
  })
})
