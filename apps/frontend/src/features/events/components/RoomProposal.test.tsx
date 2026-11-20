import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RoomAssignments } from "@/features/events/api/room-assignments"
import { RoomProposal } from "@/features/events/components/RoomProposal"

Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const { get, post, success } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), success: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, post }, apiErrorCode: () => undefined }))
vi.mock("@/lib/notify", () => ({ notify: { success, error: vi.fn() } }))

const person = (id: string, firstName: string, lastName: string, isIndividual = false) => ({
  applicationTermId: id,
  applicationId: `a-${id}`,
  firstName,
  lastName,
  birthYear: 2011,
  gender: "FEMALE" as const,
  individualAccommodation: isIndividual,
  status: "CONFIRMED" as const,
  wishes: [],
})
const room = (id: string, name: string, beds: number, participants = [] as never[]) => ({
  id,
  name,
  capacity: beds,
  extraBeds: 0,
  beds,
  gender: "FEMALE" as const,
  participants,
})
const base = (): RoomAssignments => ({
  eventId: "e1",
  termId: "t1",
  rooms: [room("r1", "Room A", 2), room("r2", "Room B", 2)],
  unassigned: [
    { ...person("p1", "Jana", "Nováková"), alsoInTerms: [] },
    { ...person("p2", "Eva", "Horká"), alsoInTerms: [] },
    { ...person("p3", "Lucie", "Veselá", true), alsoInTerms: [] },
  ],
  warnings: [],
  summary: { violations: 0, acknowledged: 0, confirmedWithoutBed: 3 },
})
const proposal = {
  placements: [
    { applicationTermId: "p1", roomId: "r1" },
    { applicationTermId: "p2", roomId: "r1" },
  ],
  unplaced: [{ applicationTermId: "p3", reason: "INDIVIDUAL_ACCOMMODATION" }],
  wishes: [{ applicationTermId: "p1", name: "Nobody Here", matches: [], fulfilled: false }],
}

let data = base()
const term = { eventId: "e1", termId: "t1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

function renderProposal() {
  get.mockImplementation(() => ({ json: () => Promise.resolve(data) }))
  post.mockImplementation((url: string) =>
    url.endsWith("/proposal") ? { json: () => Promise.resolve(proposal) } : Promise.resolve(),
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RoomProposal term={term}>
        {({ action, notices }) => (
          <>
            {action}
            {notices}
            <p>Regular assignment</p>
          </>
        )}
      </RoomProposal>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe("room proposal (US-147)", () => {
  beforeEach(() => {
    data = base()
    for (const mock of [get, post, success]) mock.mockReset()
  })

  // US-145: the proposal never fills individual rooms, so with only those there is nothing to propose.
  it("offers no proposal when the term has only individual rooms", async () => {
    data = {
      ...base(),
      rooms: [{ ...room("r1", "Family", 4), gender: null, individual: true }],
    }
    renderProposal()
    await screen.findByText("Regular assignment")
    expect(screen.queryByRole("button", { name: "Propose distribution" })).not.toBeInTheDocument()
  })

  it("keeps the proposal as an unsaved draft and saves nothing until it is confirmed", async () => {
    const user = renderProposal()
    await user.click(await screen.findByRole("button", { name: "Propose distribution" }))
    expect(await screen.findByText("Unsaved proposal")).toBeInTheDocument()
    expect(screen.getByText("2 new assignments")).toBeInTheDocument()
    expect(screen.getByText("1 unfulfilled wish")).toBeInTheDocument()
    expect(
      screen.getByText("Individual accommodation, handled manually.", { exact: false }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Regular assignment")).not.toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: "Save distribution" }))
    const dialog = await screen.findByRole("dialog")
    expect(post).toHaveBeenCalledTimes(1)
    await user.click(within(dialog).getByRole("button", { name: "Save distribution" }))
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith("organizer/events/e1/terms/t1/room-assignments/bulk", {
        json: { assignments: proposal.placements },
      }),
    )
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Distribution saved", expect.any(String)),
    )
    expect(await screen.findByText("Regular assignment")).toBeInTheDocument()
  })

  it("discards the draft after confirming without saving", async () => {
    const user = renderProposal()
    await user.click(await screen.findByRole("button", { name: "Propose distribution" }))
    await user.click(await screen.findByRole("button", { name: "Discard proposal" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Discard proposal" }))
    expect(await screen.findByRole("button", { name: "Propose distribution" })).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("moves a proposed participant to another free bed inside the draft only", async () => {
    const user = renderProposal()
    await user.click(await screen.findByRole("button", { name: "Propose distribution" }))
    await user.click(await screen.findByRole("button", { name: "Edit assignment: Jana Nováková" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("radio", { name: "Room B · bed 1" }))
    await user.click(within(dialog).getByRole("button", { name: "Use in proposal" }))
    await user.click(screen.getByRole("button", { name: "Save distribution" }))
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Save distribution" }),
    )
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(expect.stringContaining("/bulk"), {
        json: {
          assignments: [
            { applicationTermId: "p1", roomId: "r2" },
            { applicationTermId: "p2", roomId: "r1" },
          ],
        },
      }),
    )
  })

  it("explains that nobody can be proposed when only individual accommodation is left", async () => {
    data = {
      ...base(),
      unassigned: [{ ...person("p3", "Lucie", "Veselá", true), alsoInTerms: [] }],
    }
    renderProposal()
    expect(await screen.findByText("Nobody to assign automatically")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Propose distribution" })).not.toBeInTheDocument()
  })

  it("shows an error and offers the proposal again when it cannot be created", async () => {
    const user = renderProposal()
    post.mockImplementation(() => ({ json: () => Promise.reject(new Error("boom")) }))
    await user.click(await screen.findByRole("button", { name: "Propose distribution" }))
    expect(await screen.findByText("The proposal could not be created")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Propose distribution" })).toBeEnabled()
  })
})
