import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrganizerArrangements } from "@/features/participant/components/OrganizerArrangements"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, put } }))

const arrangements = (terms: object[]) => ({
  applicationId: "a1",
  eventName: "Letní kemp",
  firstName: "Adam",
  lastName: "Dvořák",
  terms,
})
const confirmed = {
  termId: "t1",
  name: "Letní týden",
  startsOn: "2027-07-12",
  endsOn: "2027-07-19",
  status: "CONFIRMED",
  roomWishes: { names: [], noRoomWishes: false, canDecline: true },
  stay: { lateArrival: null, earlyDeparture: null },
}

function setup(terms: object[]) {
  get.mockReturnValue({ json: () => Promise.resolve(arrangements(terms)) })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrganizerArrangements
        eventId="e1"
        applicationId="a1"
      />
    </QueryClientProvider>,
  )
}

describe("OrganizerArrangements (#787, #788)", () => {
  beforeEach(() => {
    get.mockReset()
    put.mockReset().mockResolvedValue(undefined)
  })

  it("shows the participant and the term with the same cards as the participant has", async () => {
    setup([confirmed])
    expect(await screen.findByText("Adam Dvořák · Letní kemp")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Roommate wishes" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Enter wishes" })).toBeVisible()
  })

  it("writes the roommate wishes to the organizer's endpoint", async () => {
    setup([confirmed])
    await userEvent.click(await screen.findByRole("button", { name: "Enter wishes" }))
    await userEvent.type(screen.getByLabelText("Name 1"), "Eva Černá")
    await userEvent.click(screen.getByRole("button", { name: /^Save/ }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("organizer/applications/a1/terms/t1/room-wishes", {
        json: { names: ["Eva Černá"] },
      }),
    )
  })

  it("confirms „no wishes“ for the participant only while it is still possible", async () => {
    setup([confirmed])
    await userEvent.click(await screen.findByRole("button", { name: "I have no wishes" }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("organizer/applications/a1/terms/t1/room-wishes", {
        json: { names: [], noRoomWishes: true },
      }),
    )
  })

  it("offers neither wishes nor decline for a term that cannot take them (not confirmed)", async () => {
    setup([{ ...confirmed, status: "WAITLISTED", roomWishes: undefined }])
    await screen.findByText("Adam Dvořák · Letní kemp")
    expect(screen.queryByRole("heading", { name: "Roommate wishes" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "I have no wishes" })).not.toBeInTheDocument()
  })

  it("says so when nothing can be entered for the application", async () => {
    setup([{ ...confirmed, status: "CANCELLED", roomWishes: undefined, stay: undefined }])
    expect(await screen.findByText(/No roommate wishes or stay can be entered/)).toBeVisible()
  })
})
