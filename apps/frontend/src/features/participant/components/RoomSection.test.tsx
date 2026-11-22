import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { MyApplicationTerm } from "@/features/participant/api/applications"
import { RoomSection } from "@/features/participant/components/RoomSection"

const term = (overrides: Partial<MyApplicationTerm> = {}): MyApplicationTerm => ({
  termId: "t1",
  name: "Letní týden",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  status: "CONFIRMED",
  priceCzk: 4500,
  transportOffered: false,
  transportDecided: false,
  ...overrides,
})

describe("RoomSection", () => {
  it("shows nothing while the assignment is not published", () => {
    const { container } = render(<RoomSection terms={[term()]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the room name of a published term", () => {
    render(<RoomSection terms={[term({ room: { name: "Bříza 204" } })]} />)
    expect(screen.getByRole("heading", { name: "Room" })).toBeInTheDocument()
    expect(screen.getByText("Bříza 204")).toBeInTheDocument()
    expect(screen.queryByText("You have no room assigned yet.")).not.toBeInTheDocument()
  })

  it("shows the named occupants and vacant beds for a published room", () => {
    render(
      <RoomSection
        terms={[
          term({
            room: {
              name: "Bříza 204",
              occupancy: {
                beds: 3,
                occupants: [
                  { firstName: "Jana", initials: "JN", isSelf: true },
                  { firstName: "Eva", initials: "EČ", isSelf: false },
                ],
              },
            },
          }),
        ]}
      />,
    )
    expect(screen.getByText("2 of 3 beds occupied")).toBeVisible()
    expect(screen.getByRole("list", { name: "Beds" })).toBeVisible()
    expect(screen.getByText("Jana")).toBeVisible()
    expect(screen.getByText("(you)")).toBeInTheDocument()
    expect(screen.getByText("Eva")).toBeVisible()
    expect(screen.getByText("EČ")).toBeVisible()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByText("Vacant")).toBeVisible()
  })

  it("keeps the number of vacant slots bounded for an unusually large room", () => {
    render(
      <RoomSection
        terms={[
          term({
            room: {
              name: "Hala",
              occupancy: {
                beds: 1000,
                occupants: [{ firstName: "Jana", initials: "JN", isSelf: true }],
              },
            },
          }),
        ]}
      />,
    )
    expect(screen.getByText("1 of 1000 beds occupied")).toBeVisible()
    expect(screen.getAllByRole("listitem")).toHaveLength(21)
  })

  it("says there is no room yet when the participant is not assigned", () => {
    render(<RoomSection terms={[term({ room: { name: null } })]} />)
    expect(screen.getByText("You have no room assigned yet.")).toBeInTheDocument()
  })
})
