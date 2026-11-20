import { describe, expect, it } from "vitest"

import { resultFileName } from "@/features/event-overview/lib/download-csv"

describe("resultFileName", () => {
  it("adds the suffix before the extension of the uploaded file", () => {
    expect(resultFileName("Pohyby_7594315496_2026-05.csv")).toBe(
      "Pohyby_7594315496_2026-05-result.csv",
    )
    expect(resultFileName("výpis.final.csv")).toBe("výpis.final-result.csv")
    expect(resultFileName("vypis")).toBe("vypis-result.csv")
    expect(resultFileName(".csv")).toBe("statement-result.csv")
  })
})
