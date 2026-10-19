import { describe, expect, it } from "vitest"

import { formatDateRange, formatMonthRange } from "@/lib/date"

describe("formatDateRange", () => {
  it("writes a week inside one month the way the price list does (cs)", () => {
    expect(formatDateRange("2027-07-12", "2027-07-18", { language: "cs" })).toBe("12.–18. 7.")
    expect(
      formatDateRange("2027-07-12", "2027-07-18", { shouldShowYear: true, language: "cs" }),
    ).toBe("12.–18. 7. 2027")
  })

  it("writes both months when the range crosses a month (cs)", () => {
    expect(
      formatDateRange("2027-07-28", "2027-08-03", { shouldShowYear: true, language: "cs" }),
    ).toBe("28. 7. – 3. 8. 2027")
  })

  it("keeps both years when the range crosses New Year (cs)", () => {
    expect(
      formatDateRange("2027-12-28", "2028-01-03", { shouldShowYear: true, language: "cs" }),
    ).toBe("28. 12. 2027 – 3. 1. 2028")
  })

  it("writes dates in English", () => {
    expect(
      formatDateRange("2027-07-12", "2027-07-18", { shouldShowYear: true, language: "en" }),
    ).toBe("12–18 Jul 2027")
    expect(formatDateRange("2027-07-28", "2027-08-03", { language: "en" })).toBe("28 Jul – 3 Aug")
  })
})

describe("formatMonthRange", () => {
  it("names the months an event spans", () => {
    expect(formatMonthRange("2027-07-12", "2027-08-08", "cs")).toBe("červenec–srpen 2027")
    expect(formatMonthRange("2027-07-12", "2027-08-08", "en")).toBe("July–August 2027")
  })

  it("names one month once", () => {
    expect(formatMonthRange("2027-07-04", "2027-07-17", "cs")).toBe("červenec 2027")
  })

  it("keeps both years across New Year", () => {
    expect(formatMonthRange("2027-12-28", "2028-01-03", "en")).toBe("December 2027–January 2028")
  })
})
