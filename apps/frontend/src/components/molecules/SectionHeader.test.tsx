import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SectionHeader } from "@/components/molecules/SectionHeader"

describe("SectionHeader", () => {
  it("shows the h2 with the actions next to it on a sub-page", () => {
    render(
      <SectionHeader
        title="Cancellation terms"
        actions={<button type="button">Save</button>}
      />,
    )

    expect(screen.getByRole("heading", { level: 2, name: "Cancellation terms" })).not.toHaveClass(
      "sr-only",
    )
  })

  // An event section under its tabs: the selected tab already names it (DESIGN.md, event header).
  it("keeps the h2 for screen readers only and right-aligns the actions under the tabs", () => {
    render(
      <SectionHeader
        isTitleHidden
        title="Board"
        actions={<button type="button">New post</button>}
      />,
    )

    const heading = screen.getByRole("heading", { level: 2, name: "Board" })
    expect(heading).toHaveClass("sr-only")
    expect(heading.parentElement).toHaveClass("justify-end")
    expect(heading.parentElement).toContainElement(screen.getByRole("button", { name: "New post" }))
  })

  it("leaves only the hidden h2 when the section has no action", () => {
    const { container } = render(
      <SectionHeader
        isTitleHidden
        title="Accommodation"
      />,
    )

    expect(container.firstElementChild).toBe(
      screen.getByRole("heading", { level: 2, name: "Accommodation" }),
    )
    expect(container.firstElementChild).toHaveClass("sr-only")
  })
})
