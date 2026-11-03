import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, post } }))
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const row = (id: string, firstName: string, gender: "MALE" | "FEMALE", minute: number) => ({
  id,
  firstName,
  lastName: "Test",
  birthDate: "2011-05-04",
  gender,
  email: `${id}@example.com`,
  submittedAt: `2027-03-10T09:${String(minute).padStart(2, "0")}:00Z`,
  amountDueCzk: 0,
  amountPaidCzk: 0,
  amountOwedCzk: 0,
  paymentStatus: "NOTHING_DUE",
  terms: [
    {
      id: "t1",
      name: null,
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      status: "TO_EVALUATE",
      priceCzk: 1000,
      waitlistPosition: null,
    },
  ],
})
const rows = [
  row("a1", "Adam", "MALE", 1),
  row("a2", "Petr", "MALE", 2),
  row("a3", "Jana", "FEMALE", 3),
]
const named = (id: string, name: string) => ({ applicationId: id, name })

function setup(filters: ApplicationsSearch = { status: "TO_EVALUATE", term: "t1" }) {
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("occupancy")
          ? {
              eventId: "e1",
              terms: [
                {
                  id: "t1",
                  name: null,
                  roomMode: "GENDERED",
                  roomCount: 2,
                  startsOn: "2027-07-12",
                  endsOn: "2027-07-18",
                  capacity: 4,
                  confirmed: 2,
                  free: 2,
                  waitlisted: 0,
                  byGender: null,
                },
              ],
            }
          : rows,
      ),
  }))
  post.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("preview")
          ? {
              selectedCount: 3,
              freePlaces: { FEMALE: 1, MALE: 1 },
              isShared: false,
              confirmable: [named("a1", "Adam Test"), named("a3", "Jana Test")],
              skipped: [named("a2", "Petr Test")],
            }
          : { confirmed: ["a1", "a3"], unchanged: ["a2"] },
      ),
  }))
  function Page() {
    const [current, setCurrent] = useState(filters)
    return (
      <ApplicationsPage
        eventId="e1"
        filters={current}
        onFiltersChange={setCurrent}
      />
    )
  }
  const root = createRootRoute({ component: Page })
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

beforeEach(() => vi.clearAllMocks())
describe("bulk confirmation (US-107)", () => {
  it("has no selection until a term is chosen", async () => {
    setup({ status: "TO_EVALUATE" })
    await screen.findByText("Adam Test")
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  it("selects every application in the filter, checks the capacity and confirms those that fit", async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("checkbox", { name: /Select all in the filter/ }))
    expect(screen.getByText("Selected applications")).toBeInTheDocument()
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(4)

    await user.click(screen.getByRole("button", { name: "Confirm selected" }))
    const dialog = await screen.findByRole("dialog", { name: "Confirm selected applications" })
    expect(await within(dialog).findByText("1 men's + 1 women's")).toBeInTheDocument()
    expect(within(dialog).getByText("Adam Test and Jana Test")).toBeInTheDocument()
    expect(within(dialog).getByText("2 of 3 applications will be confirmed.")).toBeInTheDocument()
    expect(
      within(dialog).getByText("Petr Test does not fit into the capacity and stays To evaluate."),
    ).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith(
      "organizer/events/e1/terms/t1/bulk-confirmation/preview",
      expect.objectContaining({ json: { applicationIds: ["a1", "a2", "a3"] } }),
    )

    await user.click(within(dialog).getByRole("button", { name: "Confirm 2 applications" }))
    expect(await screen.findByText("2 applications confirmed, 1 unchanged.")).toBeInTheDocument()
    expect(screen.getByText(/Adam and Jana will receive an e-mail/)).toBeInTheDocument()
    expect(screen.getByText(/Petr stays To evaluate\./)).toBeInTheDocument()
    expect(screen.getAllByText("Participation confirmed")).toHaveLength(2)
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/bulk-confirmation", {
      json: { applicationIds: ["a1", "a2", "a3"] },
    })
  })

  it("selects single applications and clears the selection", async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole("checkbox", { name: "Select application: Jana Test" }))
    expect(screen.queryByText("Selected applications")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Clear selection" }))
    expect(screen.queryByText("Selected applications")).toBeNull()
  })
})
