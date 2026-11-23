import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8")

const printBlock = css.slice(css.indexOf("@media print"), css.indexOf("The disclosure arrow"))

describe("print stylesheet", () => {
  // Hidden content keeps its layout height and pushes the printed block onto blank pages (#697).
  it("removes everything outside the print area from the layout instead of hiding it", () => {
    expect(printBlock).toContain("data-print-area")
    expect(printBlock).not.toContain("visibility")
    expect(printBlock).toContain("display: none")
  })

  it("flattens the ancestors of the print area so nothing clips the pages", () => {
    expect(printBlock).toMatch(/:has\(\[data-print-area\]\)[^{]*\{[^}]*overflow: visible/)
    expect(printBlock).toMatch(/:has\(\[data-print-area\]\)[^{]*\{[^}]*height: auto/)
  })
})
