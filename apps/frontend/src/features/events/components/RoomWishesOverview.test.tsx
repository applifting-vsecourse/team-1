import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomAssignments } from "@/features/events/api/room-assignments"
import { RoomWishesOverview } from "@/features/events/components/RoomWishesOverview"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const person = (
  id: string,
  firstName: string,
  lastName: string,
  wishes: { name: string; fulfilled: boolean }[],
) => ({
  applicationTermId: id,
  applicationId: `a-${id}`,
  firstName,
  lastName,
  birthYear: 2011,
  gender: "FEMALE" as const,
  individualAccommodation: false,
  status: "CONFIRMED" as const,
  wishes,
})

const response = (rooms: RoomAssignments["rooms"]): RoomAssignments => ({
  eventId: "e1",
  termId: "t1",
  rooms,
  unassigned: [],
  warnings: [],
  summary: { violations: 0, acknowledged: 0, confirmedWithoutBed: 0 },
})
const room = (participants: RoomAssignments["rooms"][number]["participants"]) => ({
  id: "r1",
  name: "Bříza 204",
  capacity: 4,
  extraBeds: 0,
  beds: 4,
  gender: "FEMALE" as const,
  participants,
})

const renderOverview = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomWishesOverview
        eventId="e1"
        termId="t1"
      />
    </QueryClientProvider>,
  )

describe("RoomWishesOverview", () => {
  beforeEach(() => get.mockReset())

  it("marks every wish fulfilled or not, and says when a participant has none", async () => {
    get.mockReturnValue({
      json: () =>
        response([
          room([
            person("p1", "Jana", "Nováková", [
              { name: "Eva Černá", fulfilled: true },
              { name: "Tereza Malá", fulfilled: false },
            ]),
            person("p2", "Eva", "Černá", []),
          ]),
        ]),
    })
    renderOverview()
    expect(await screen.findByRole("heading", { name: "Bříza 204" })).toBeInTheDocument()
    const wishes = screen.getByText("Tereza Malá").closest("li") as HTMLElement
    expect(within(wishes).getByText("Not fulfilled")).toBeVisible()
    expect(screen.getByText("Fulfilled")).toBeVisible()
    expect(screen.getByText("No roommate wishes")).toBeVisible()
  })

  it("shows nothing while nobody is in a room", async () => {
    get.mockReturnValue({ json: () => response([room([])]) })
    const { container } = renderOverview()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
  })
})
