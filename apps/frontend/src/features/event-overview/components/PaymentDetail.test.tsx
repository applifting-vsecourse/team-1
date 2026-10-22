import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PaymentDetail } from "@/features/event-overview/components/PaymentDetail"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))
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
    expect(screen.getByRole("button", { name: "Edit or cancel record" })).toBeInTheDocument()
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
