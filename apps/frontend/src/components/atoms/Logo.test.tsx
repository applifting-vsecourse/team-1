import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LogoSymbol } from "@/components/atoms/Logo"

describe("LogoSymbol", () => {
  it("draws the dot in brand-warm whatever colour the arcs take", () => {
    const { container } = render(<LogoSymbol className="text-primary" />)
    const dot = container.querySelector('[data-slot="logo-dot"]')
    expect(dot).toHaveClass("fill-brand-warm")
    expect(dot).not.toHaveAttribute("fill", "currentColor")
    expect(container.querySelector("path")).toHaveAttribute("stroke", "currentColor")
  })

  it("has the approved „Výrazně tučné“ weight scaled from 40 to 32 units", () => {
    const { container } = render(<LogoSymbol />)
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 32 32")
    // Figma 40-unit box: arc 3.4, dot r 3.84 → × 0.8.
    expect(container.querySelector("path")).toHaveAttribute("stroke-width", "2.72")
    expect(container.querySelector("circle")).toHaveAttribute("r", "3.072")
  })
})
