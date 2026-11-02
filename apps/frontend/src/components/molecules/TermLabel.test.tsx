import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TermLabel } from "@/components/molecules/TermLabel"

const dates = { startsOn: "2027-07-12", endsOn: "2027-07-18" }

describe("TermLabel", () => {
  it("shows the dates and the name underneath", () => {
    render(<TermLabel term={{ name: "První turnus", ...dates }} />)

    expect(screen.getByText("12–18 Jul 2027")).toBeInTheDocument()
    expect(screen.getByText("První turnus")).toBeInTheDocument()
  })

  it("shows just the dates of a term without a name", () => {
    const { container } = render(<TermLabel term={{ name: null, ...dates }} />)

    expect(screen.getByText("12–18 Jul 2027")).toBeInTheDocument()
    expect(container.textContent).toBe("12–18 Jul 2027")
  })

  it("takes a name of spaces for no name", () => {
    const { container } = render(<TermLabel term={{ name: "   ", ...dates }} />)

    expect(container.textContent).toBe("12–18 Jul 2027")
  })
})
