import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TermStatuses } from "@/features/event-overview/components/TermStatuses"

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, patch } }))

const term = (overrides: object = {}) => ({
  termId: "t1",
  name: "T1",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  status: "WAITLISTED",
  priceCzk: 6900,
  allowedStatuses: ["CONFIRMED", "CANCELLED"],
  history: [],
  ...overrides,
})

function setup() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TermStatuses applicationId="a1" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("TermStatuses", () => {
  it("offers only the changes the server allows and shows the log", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve([
          term({
            status: "CANCELLED",
            allowedStatuses: [],
            history: [
              {
                id: "c1",
                fromStatus: "CONFIRMED",
                toStatus: "CANCELLED",
                changedByName: "Eva",
                changedAt: "2027-03-10T12:00:00Z",
              },
            ],
          }),
        ]),
    })
    setup()

    expect(await screen.findByText(/Eva: Confirmed → Cancelled/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel in term" })).not.toBeInTheDocument()
  })

  it("confirms a waitlisted application after the dialog", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term()]) })
    patch.mockResolvedValue(undefined)
    setup()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Confirm" }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenCalledWith("organizer/applications/a1/terms/t1/status", {
      json: { status: "CONFIRMED" },
    })
  })

  it("warns when the capacity would be exceeded and confirms knowingly on the second click", async () => {
    get.mockReturnValue({ json: () => Promise.resolve([term()]) })
    patch.mockRejectedValueOnce(Object.assign(new Error("full"), { code: "CAPACITY_EXCEEDED" }))
    patch.mockResolvedValueOnce(undefined)
    setup()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Confirm" }))
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }))

    expect(await screen.findByText("No free bed for this gender")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Confirm anyway" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(patch).toHaveBeenLastCalledWith("organizer/applications/a1/terms/t1/status", {
      json: { status: "CONFIRMED", confirmOverCapacity: true },
    })
  })
})
