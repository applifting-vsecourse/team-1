import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AssignmentParticipant, RoomAssignments } from "@/features/events/api/room-assignments"
import { RoomWishesOverview } from "@/features/events/components/RoomWishesOverview"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params: { eventId: string; applicationId: string }
  } & React.ComponentProps<"a">) => (
    <a
      href={to.replace("$eventId", params.eventId).replace("$applicationId", params.applicationId)}
      {...props}
    >
      {children}
    </a>
  ),
}))

const person = (id: string, wishes: AssignmentParticipant["wishes"]): AssignmentParticipant => ({
  applicationTermId: id,
  applicationId: `a-${id}`,
  firstName: "Jana",
  lastName: "Nováková",
  birthYear: 2011,
  gender: "FEMALE",
  individualAccommodation: false,
  status: "CONFIRMED",
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
const room = (participants: AssignmentParticipant[]) => ({
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

  it("orders the wishes by status, reports totals and shows only the chosen status", async () => {
    get.mockReturnValue({
      json: () =>
        response([
          room([
            person("p1", [
              { name: "Eva Černá", status: "fulfilled", roomName: "Bříza 204" },
              { name: "Tereza Malá", status: "unfulfilled", roomName: "Dub 101" },
              { name: "Teresa Malá", status: "impossible", roomName: null },
            ]),
          ]),
        ]),
    })
    renderOverview()
    expect(await screen.findByRole("button", { name: "All · 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    const rows = screen.getAllByRole("listitem")
    expect(within(rows[0]!).getByText("Cannot be fulfilled")).toBeVisible()
    expect(within(rows[1]!).getByText("Not fulfilled")).toBeVisible()
    expect(within(rows[1]!).getByText("Dub 101")).toBeVisible()
    expect(within(rows[2]!).getByText("Fulfilled")).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "Cannot be fulfilled · 1" }))
    const row = screen.getByRole("listitem")
    expect(within(row).getByText("Teresa Malá")).toBeVisible()
    expect(within(row).queryByText("Tereza Malá")).not.toBeInTheDocument()
    expect(
      within(row).getByRole("link", { name: "Open application: Jana Nováková" }),
    ).toHaveAttribute("href", "/organizer/events/e1/applications/a-p1")
    expect(screen.getByRole("button", { name: "Not fulfilled · 1" })).toBeVisible()
  })

  it("includes the wishes of a participant who has no room yet", async () => {
    get.mockReturnValue({
      json: () => ({
        ...response([]),
        unassigned: [
          {
            ...person("p1", [{ name: "Eva Černá", status: "unfulfilled", roomName: null }]),
            alsoInTerms: [],
          },
        ],
      }),
    })
    renderOverview()
    expect(await screen.findByRole("button", { name: "All · 1" })).toBeVisible()
    expect(screen.getByText("Not fulfilled")).toBeVisible()
  })
})
