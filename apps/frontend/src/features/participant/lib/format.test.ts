import { describe, expect, it } from "vitest"

import { toTelHref } from "@/features/participant/lib/format"

describe("toTelHref", () => {
  it("drops the spaces so the number dials in one tap", () => {
    expect(toTelHref("+420 777 000 003")).toBe("tel:+420777000003")
  })

  it("leaves a number without spaces as it is", () => {
    expect(toTelHref("+420777000003")).toBe("tel:+420777000003")
  })
})
