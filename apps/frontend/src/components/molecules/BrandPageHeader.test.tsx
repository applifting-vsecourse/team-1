import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BrandPageHeader } from "@/components/molecules/BrandPageHeader"

describe("BrandPageHeader", () => {
  it("puts the title in the H1 with the description under it", () => {
    render(
      <BrandPageHeader
        title="Jana Nováková"
        description="Letní kemp 2027 · application LK-0001"
      />,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Jana Nováková" })).toBeVisible()
    expect(screen.getByText("Letní kemp 2027 · application LK-0001")).toBeVisible()
  })

  it("stretches the controls to full width on a phone and keeps their own width from md", () => {
    render(
      <BrandPageHeader
        title="Jana Nováková"
        actions={<button type="button">Edit application</button>}
      />,
    )

    const actions = screen.getByRole("button", { name: "Edit application" }).parentElement
    expect(actions).toHaveClass("w-full", "*:w-full", "md:w-auto", "md:*:w-auto", "md:ml-auto")
  })
})
