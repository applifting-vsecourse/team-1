import { afterEach, describe, expect, it, vi } from "vitest"

import { downloadCsv, resultFileName } from "@/features/event-overview/lib/download-csv"

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

describe("downloadCsv", () => {
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ["vypis-result.csv", "vypis-result.csv"],
    ["vypis", "vypis.csv"],
    ["vypis.txt", "vypis.txt.csv"],
  ])("downloads %s as %s from a link attached to the page", (name, expected) => {
    URL.createObjectURL = vi.fn(() => "blob:x")
    URL.revokeObjectURL = vi.fn()
    let seen: { download: string; attached: boolean } | undefined
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      seen = { download: this.download, attached: document.body.contains(this) }
    })
    downloadCsv(name, "a;b")
    expect(seen).toEqual({ download: expected, attached: true })
  })
})
