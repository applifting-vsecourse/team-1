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

  it("says there is no room yet when the participant is not assigned", () => {
    render(<RoomSection terms={[term({ room: { name: null } })]} />)
    expect(screen.getByText("You have no room assigned yet.")).toBeInTheDocument()
  })
})
