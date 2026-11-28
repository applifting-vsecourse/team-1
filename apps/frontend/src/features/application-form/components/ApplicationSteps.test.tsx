import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ApplicationSteps } from "@/features/application-form/components/ApplicationSteps"

// Stepper kit, nav A (Figma 15207:1976), as in EventSetup: grey surface, Semi Bold, an orange underline.
describe("ApplicationSteps", () => {
  it("marks the details step with the grey surface and the orange underline, no corners", () => {
    const { container } = render(<ApplicationSteps isReview={false} />)

    expect(screen.getByText("1. Details")).toHaveAttribute("aria-current", "step")
    expect(screen.getByText("2. Review")).not.toHaveAttribute("aria-current")
    const current = container.querySelector('[data-slot="step-current"]')
    expect(current).toHaveClass("bg-nav-active", "rounded-md")
    expect(current).toHaveAttribute("aria-hidden", "true")
    expect(current?.className).not.toMatch(/bg-accent/)
    expect(current?.querySelector('[data-slot="step-indicator"]')).toHaveClass(
      "bg-nav-indicator",
      "h-0.75",
      "w-5",
    )
    expect(current?.querySelector("svg")).toBeNull()
    expect(screen.getByText("1. Details")).toHaveClass("py-3", "aria-[current=step]:font-semibold")
  })

  it("slides the current surface to the review step", () => {
    const { container } = render(<ApplicationSteps isReview />)

    expect(screen.getByText("2. Review")).toHaveAttribute("aria-current", "step")
    expect(container.querySelector('[data-slot="step-current"]')).toHaveClass(
      "translate-x-[calc(100%+0.5rem)]",
    )
  })
})
