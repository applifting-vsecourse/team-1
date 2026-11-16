import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChangeRequestsPanel } from "@/features/event-overview/components/ChangeRequestsPanel"

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, patch } }))

const request = {
  id: "r1",
  applicationId: "a1",
  eventId: "e1",
  participantName: "Adam Test",
  participantGender: "MALE",
  currentTermIds: ["t1"],
  requestedTermIds: ["t2"],
  kind: "TERMS",
  currentHealthNote: null,
  requestedHealthNote: null,
  currentPriceCzk: 4900,
  requestedPriceCzk: 5600,
  status: "PENDING",
  rejectionReason: null,
  createdAt: "2027-07-03T12:00:00Z",
  reviewedAt: null,
  terms: [
    { id: "t1", name: "First", startsOn: "2027-07-12", endsOn: "2027-07-18", priceCzk: 4900 },
    { id: "t2", name: "Second", startsOn: "2027-07-19", endsOn: "2027-07-25", priceCzk: 5600 },
  ],
}

const healthRequest = {
  ...request,
  id: "r2",
  currentTermIds: [],
  requestedTermIds: [],
  kind: "HEALTH",
  currentHealthNote: "Astma",
  requestedHealthNote: "Astma, alergie",
}

beforeEach(() => {
  get.mockReset()
  patch.mockReset()
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("occupancy")
          ? {
              eventId: "e1",
              terms: [
                {
                  id: "t2",
                  name: "Second",
                  startsOn: "2027-07-19",
                  endsOn: "2027-07-25",
                  roomMode: "GENDERED",
                  roomCount: 1,
                  capacity: 2,
                  confirmed: 1,
                  free: 1,
                  waitlisted: 0,
                  byGender: {
                    FEMALE: { capacity: 0, confirmed: 0, free: 0, waitlisted: 0 },
                    MALE: { capacity: 2, confirmed: 1, free: 1, waitlisted: 0 },
                  },
                },
              ],
            }
          : [request],
      ),
  }))
})

describe("ChangeRequestsPanel", () => {
  it("opens the review dialog and approves the request", async () => {
    patch.mockResolvedValue(undefined)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ChangeRequestsPanel eventId="e1" />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Review request" }))
    const dialog = screen.getByRole("dialog", { name: "Review request" })
    expect(within(dialog).getByText("Adam Test")).toBeInTheDocument()
    expect(within(dialog).getByText(/CZK\s*4,900/)).toBeInTheDocument()
    expect(await within(dialog).findByText(/1 free bed/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Approve request" }))
    expect(patch).toHaveBeenCalledWith("organizer/events/e1/change-requests/r1/approve", {
      json: {},
    })
  })

  it("sends the entered rejection reason", async () => {
    patch.mockResolvedValue(undefined)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ChangeRequestsPanel eventId="e1" />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Review request" }))
    const dialog = screen.getByRole("dialog", { name: "Review request" })
    await user.type(
      within(dialog).getByRole("textbox", { name: "Reason for declining" }),
      "Please contact us",
    )
    await user.click(within(dialog).getByRole("button", { name: "Decline request" }))
    expect(patch).toHaveBeenCalledWith("organizer/events/e1/change-requests/r1/reject", {
      json: { reason: "Please contact us" },
    })
  })

  it("shows a health request with the current and the requested note and approves it", async () => {
    patch.mockResolvedValue(undefined)
    get.mockImplementation(() => ({ json: () => Promise.resolve([healthRequest]) }))
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ChangeRequestsPanel eventId="e1" />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    expect(await screen.findByText("Health restriction change")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Review request" }))
    const dialog = screen.getByRole("dialog", { name: "Review request" })
    expect(within(dialog).getByText("Astma")).toBeInTheDocument()
    expect(within(dialog).getByText("Astma, alergie")).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Approve request" }))
    expect(patch).toHaveBeenCalledWith("organizer/events/e1/change-requests/r2/approve", {
      json: {},
    })
  })
  describe.each([
    ["TERMS", request],
    ["HEALTH", healthRequest],
  ])("%s request form", (_kind, item) => {
    const renderPanel = () => {
      get.mockImplementation((path: string) => ({
        json: () =>
          Promise.resolve(path.endsWith("occupancy") ? { eventId: "e1", terms: [] } : [item]),
      }))
      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <ChangeRequestsPanel eventId="e1" />
        </QueryClientProvider>,
      )
    }

    it("is closed until a request is selected", async () => {
      renderPanel()
      expect(await screen.findByRole("button", { name: "Review request" })).toBeInTheDocument()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(
        screen.queryByRole("textbox", { name: "Reason for declining" }),
      ).not.toBeInTheDocument()
      await userEvent.setup().click(screen.getByRole("button", { name: "Review request" }))
      expect(screen.getByRole("dialog", { name: "Review request" })).toBeInTheDocument()
    })

    it("closes on Back to requests without any API call or reason kept", async () => {
      renderPanel()
      const user = userEvent.setup()
      await user.click(await screen.findByRole("button", { name: "Review request" }))
      await user.type(screen.getByRole("textbox", { name: "Reason for declining" }), "draft")
      await user.click(screen.getByRole("button", { name: "Back to requests" }))
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(patch).not.toHaveBeenCalled()
      await user.click(screen.getByRole("button", { name: "Review request" }))
      expect(screen.getByRole("textbox", { name: "Reason for declining" })).toHaveValue("")
    })

    it("closes with the close icon and Escape without any API call", async () => {
      renderPanel()
      const user = userEvent.setup()
      await user.click(await screen.findByRole("button", { name: "Review request" }))
      await user.click(screen.getByRole("button", { name: "Close" }))
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Review request" }))
      await user.keyboard("{Escape}")
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(patch).not.toHaveBeenCalled()
    })
  })
})
