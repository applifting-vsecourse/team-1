import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"

const { get, remove } = vi.hoisted(() => ({ get: vi.fn(), remove: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, delete: remove } }))
const application = {
  id: "a1",
  eventId: "e1",
  eventName: "Camp",
  firstName: "Adam",
  lastName: "Test",
  code: "C-0047",
  terms: [{ status: "CONFIRMED", priceCzk: 6900, startsOn: "2027-07-12", endsOn: "2027-07-18" }],
  payments: [],
  amountDueCzk: 6900,
  amountPaidCzk: 0,
  amountOwedCzk: 6900,
}

function setup() {
  const root = createRootRoute({ component: () => <PaymentDetail applicationId="a1" /> })
  const route = createRoute({ getParentRoute: () => root, path: "/" })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
})

describe("PaymentDetail", () => {
  it("shows no payments and links back to the correct event's applications", async () => {
    get.mockReturnValue({ json: () => Promise.resolve(application) })
    setup()
    expect(
      await screen.findByRole("heading", { name: "Payment and application details" }),
    ).toBeInTheDocument()
    expect(screen.getByText("No payment recorded yet.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to applications" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications",
    )
  })

  it("shows a partial payment and its author in the history", async () => {
    get.mockReturnValue({
      json: () =>
        Promise.resolve({
          ...application,
          amountPaidCzk: 3000,
          amountOwedCzk: 3900,
          payments: [
            { id: "p1", amountCzk: 3000, createdAt: "2027-03-10T12:00:00Z", recordedByName: "Eva" },
          ],
        }),
    })
    setup()
    expect(await screen.findByText(/Left to pay:.*3,900/)).toBeInTheDocument()
    expect(screen.getByText("Recorded by Eva")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel record" })).toBeInTheDocument()
  })

  it("confirms cancellation of one receipt and preserves the other receipts", async () => {
    const payments = [
      { id: "p1", amountCzk: 3000, createdAt: "2027-03-10T12:00:00Z", recordedByName: "Eva" },
      { id: "p2", amountCzk: 1000, createdAt: "2027-03-12T12:00:00Z", recordedByName: "Eva" },
    ]
    let data = { ...application, amountPaidCzk: 4000, amountOwedCzk: 2900, payments }
    get.mockReturnValue({ json: () => Promise.resolve(data) })
    remove.mockImplementation(() => {
      data = { ...data, payments: [payments[0]!], amountPaidCzk: 3000, amountOwedCzk: 3900 }
      return Promise.resolve()
    })
    setup()
    const user = userEvent.setup()
    await screen.findByRole("table")
    const row = screen.getByRole("row", { name: /1,000/ })
    await user.click(within(row).getByRole("button", { name: "Cancel record" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/After cancellation, amount owed:.*3,900/)).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole("button", { name: "Keep payment" }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(within(row).getByRole("button", { name: "Cancel record" }))
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel record" }),
    )
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith("organizer/applications/a1/payments/p2"),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(screen.getByRole("row", { name: /3,000/ })).toBeInTheDocument()
    expect(screen.getByText(/Left to pay:.*3,900/)).toBeInTheDocument()
  })

  it("shows a load error and retry without exposing a payment form", async () => {
    get.mockReturnValue({
      json: () => Promise.reject(new Error("Forbidden")),
    })
    setup()
    expect(await screen.findByText("Payment details could not be loaded")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })
})
