import { describe, expect, it } from "vitest"

import { applicationLink } from "@/features/events/lib/application-link"

describe("applicationLink", () => {
  it("joins the origin and the public token", () => {
    expect(applicationLink("abc_-1", "https://togena.example")).toBe(
      "https://togena.example/apply/abc_-1",
    )
  })
})
