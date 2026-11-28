import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Sticker } from "@/components/atoms/Sticker"

describe("Sticker", () => {
  it("is decoration hidden from assistive technology, so it never carries the state alone", () => {
    const { container } = render(<Sticker label="Confirmed" />)
    const sticker = container.firstElementChild
    expect(sticker).toHaveTextContent("Confirmed")
    expect(sticker).toHaveAttribute("aria-hidden", "true")
  })

  it("is static and tilted −2° by default", () => {
    const { container } = render(<Sticker label="Confirmed" />)
    const sticker = container.firstElementChild
    expect(sticker).not.toHaveAttribute("data-animated")
    expect(sticker).toHaveAttribute("data-size", "m")
    expect(sticker).toHaveClass("-rotate-2")
  })

  it("marks the M32 animation and the illustration tilt when asked", () => {
    const { container } = render(
      <Sticker
        label="Confirmed"
        size="s"
        tilt="illustration"
        isAnimated
      />,
    )
    const sticker = container.firstElementChild
    expect(sticker).toHaveAttribute("data-animated", "true")
    expect(sticker).toHaveAttribute("data-size", "s")
    expect(sticker).toHaveClass("-rotate-8")
  })
})
