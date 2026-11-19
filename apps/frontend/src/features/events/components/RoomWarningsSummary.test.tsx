import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RoomWarningsSummary } from "@/features/events/components/RoomWarnings"

const person = {
  id: "p1",
  applicationTermId: "at1",
  firstName: "Jana",
  lastName: "Nováková",
  gender: "FEMALE",
  status: "CONFIRMED",
  individualAccommodation: false,
} as never
const room = {
  id: "r1",
  name: "A",
  capacity: 4,
  extraBeds: 0,
  beds: 4,
  gender: "FEMALE",
  participants: [person],
}

const renderSummary = (violations: number, confirmedWithoutBed: number, isSharedMode = false) =>
  render(
    <RoomWarningsSummary
      data={
        {
          rooms: [room],
          warnings: [],
          summary: { violations, acknowledged: 0, confirmedWithoutBed },
        } as never
      }
      isSharedMode={isSharedMode}
    />,
  )

describe("RoomWarningsSummary", () => {
  it("at 0 violations shows a quiet line without a number, even with people without a bed", () => {
    const { container } = renderSummary(0, 97)
    expect(screen.getByText("Room rules are followed")).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\d/)
    expect(container.querySelector(".lucide-circle-check, .lucide-check-circle-2")).not.toBeNull()
    expect(container.querySelector(".lucide-triangle-alert")).toBeNull()
  })

  it("at 1+ violations shows the warning with the count only", () => {
    const { container } = renderSummary(2, 97)
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText(/rules broken/)).toBeInTheDocument()
    expect(container.textContent).not.toContain("97")
    expect(container.querySelector(".lucide-triangle-alert")).not.toBeNull()
  })

  it("keeps the shared-rooms note", () => {
    renderSummary(0, 0, true)
    expect(screen.getByText("Mixed genders are not checked in shared rooms.")).toBeInTheDocument()
  })
})
