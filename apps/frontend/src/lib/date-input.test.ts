import { describe, expect, it } from "vitest"

import {
  formatDateInput,
  isIsoDate,
  isoToLocalDate,
  localDateToIso,
  parseDateInput,
} from "@/lib/date-input"

describe("parseDateInput", () => {
  it("reads the Czech form with and without spaces and leading zeros", () => {
    expect(parseDateInput("18. 5. 2014")).toBe("2014-05-18")
    expect(parseDateInput("18.5.2014")).toBe("2014-05-18")
    expect(parseDateInput("18. 05. 2014")).toBe("2014-05-18")
    expect(parseDateInput(" 01. 12. 2010 ")).toBe("2010-12-01")
  })

  it("reads the English form and other separators", () => {
    expect(parseDateInput("18/05/2014")).toBe("2014-05-18")
    expect(parseDateInput("18/5/2014")).toBe("2014-05-18")
    expect(parseDateInput("18-05-2014")).toBe("2014-05-18")
  })

  it("reads exactly eight digits as DDMMYYYY", () => {
    expect(parseDateInput("18052014")).toBe("2014-05-18")
    expect(parseDateInput("29022016")).toBe("2016-02-29")
  })

  it("does not guess shorter digits or fix a day that does not exist", () => {
    expect(parseDateInput("1852014")).toBeNull()
    expect(parseDateInput("180514")).toBeNull()
    expect(parseDateInput("31022014")).toBeNull()
  })

  it("accepts a pasted ISO day", () => {
    expect(parseDateInput("2014-05-18")).toBe("2014-05-18")
  })

  it("accepts a leap day only in a leap year", () => {
    expect(parseDateInput("29. 2. 2020")).toBe("2020-02-29")
    expect(parseDateInput("29. 2. 2000")).toBe("2000-02-29")
    expect(parseDateInput("29. 2. 2019")).toBeNull()
    expect(parseDateInput("29. 2. 1900")).toBeNull()
  })

  it("rejects days that do not exist", () => {
    expect(parseDateInput("31. 2. 2014")).toBeNull()
    expect(parseDateInput("31. 4. 2014")).toBeNull()
    expect(parseDateInput("18. 13. 2014")).toBeNull()
    expect(parseDateInput("0. 5. 2014")).toBeNull()
    expect(parseDateInput("2014-02-31")).toBeNull()
  })

  it("rejects empty and partial input", () => {
    expect(parseDateInput("")).toBeNull()
    expect(parseDateInput("18")).toBeNull()
    expect(parseDateInput("18. 5.")).toBeNull()
    expect(parseDateInput("18. 5. 14")).toBeNull()
    expect(parseDateInput("18/05/")).toBeNull()
    expect(parseDateInput("květen 2014")).toBeNull()
  })
})

describe("isIsoDate", () => {
  it("is true only for a real yyyy-MM-dd day", () => {
    expect(isIsoDate("2014-05-18")).toBe(true)
    expect(isIsoDate("2014-02-31")).toBe(false)
    expect(isIsoDate("18. 5. 2014")).toBe(false)
    expect(isIsoDate("")).toBe(false)
  })
})

describe("formatDateInput", () => {
  it("shows D. M. YYYY in Czech and DD/MM/YYYY in English", () => {
    expect(formatDateInput("2014-05-08", "cs")).toBe("8. 5. 2014")
    expect(formatDateInput("2014-05-08", "en")).toBe("08/05/2014")
    expect(formatDateInput("2014-12-18", "cs")).toBe("18. 12. 2014")
  })

  it("leaves something that is not an ISO day as it is", () => {
    expect(formatDateInput("18.", "cs")).toBe("18.")
    expect(formatDateInput("", "en")).toBe("")
  })

  it("round-trips through the parser", () => {
    expect(parseDateInput(formatDateInput("2020-02-29", "cs"))).toBe("2020-02-29")
    expect(parseDateInput(formatDateInput("2020-02-29", "en"))).toBe("2020-02-29")
  })
})

describe("local days", () => {
  const original = process.env.TZ
  const zones = ["UTC", "America/Los_Angeles", "Pacific/Auckland", "Pacific/Kiritimati"]

  it.each(zones)("never shifts the day in %s", (zone) => {
    process.env.TZ = zone
    try {
      for (const iso of ["2014-05-18", "2026-03-29", "2026-10-25", "2020-02-29", "1900-01-01"]) {
        const date = isoToLocalDate(iso)
        expect(date).toBeDefined()
        expect(localDateToIso(date!)).toBe(iso)
        expect(date!.getDate()).toBe(Number(iso.slice(8, 10)))
      }
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })

  it("has no date for something that is not an ISO day", () => {
    expect(isoToLocalDate("18.")).toBeUndefined()
  })
})
