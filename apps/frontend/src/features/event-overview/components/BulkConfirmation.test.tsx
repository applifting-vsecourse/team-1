import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { configure, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, post } }))
// The page loads several queries and renders a table and a card list; a pre-push run is slower.
configure({ asyncUtilTimeout: 5000 })
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

const onFiltersChange = vi.fn()

function setup(filters: ApplicationsSearch = { status: "TO_EVALUATE", term: "t1" }, termCount = 1) {
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("occupancy")
          ? {
              eventId: "e1",
              terms: Array.from({ length: termCount }, (_, index) => ({
                id: `t${index + 1}`,
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
              })),
            }
          : rows,
      ),
  }))
  post.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("bulk-decision")
          ? { changed: ["a1", "a3"], unchanged: ["a2"] }
          : path.endsWith("preview")
            ? {
                selectedCount: 3,
                freePlaces: { FEMALE: 1, MALE: 1 },
                freePlacesAfter: { FEMALE: 0, MALE: 0 },
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
        onFiltersChange={(next) => {
          onFiltersChange(next)
          setCurrent(next)
        }}
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
const selectAll = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole("checkbox", { name: /Select all in the filter/ }))

describe("bulk decisions on the queue (US-107, US-108)", () => {
  it("has no selection with several terms until one is chosen, and asks to choose it", async () => {
    setup({ status: "TO_EVALUATE" }, 2)
    await screen.findAllByText(/Adam Test/)
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(
      screen.getByText("To evaluate applications in bulk, choose a term in the filter first."),
    ).toBeInTheDocument()
  })

  it("lets the only term be decided on without choosing it", async () => {
    setup({ status: "TO_EVALUATE" })
    expect(
      await screen.findByRole("checkbox", { name: /Select all in the filter/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/choose a term/)).toBeNull()
  })

  it("offers three differently coloured actions, and no way to clear the selection", async () => {
    setup()
    const user = userEvent.setup()
    await user.click(
      (await screen.findAllByRole("checkbox", { name: "Select application: Jana Test" }))[0]!,
    )
    expect(screen.getByText("1 application")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move to waitlist" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Clear selection/ })).toBeNull()
  })

  it("confirms those that fit after a dialog that shows the free beds before and after", async () => {
    setup()
    const user = userEvent.setup()
    await selectAll(user)
    await user.click(screen.getByRole("button", { name: "Confirm" }))
    const dialog = await screen.findByRole("dialog", { name: "Confirm selected applications" })
    expect(await within(dialog).findByText("Will be confirmed")).toBeInTheDocument()
    expect(within(dialog).getByText("Adam Test and Jana Test")).toBeInTheDocument()
    expect(within(dialog).getByText("Free beds after the confirmation")).toBeInTheDocument()
    expect(
      within(dialog).getByText("1 men's + 1 women's → 0 men's + 0 women's"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("2 of 3 applications will be confirmed.")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Confirm applications" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/bulk-confirmation", {
      json: { applicationIds: ["a1", "a2", "a3"] },
    })
    // Back on the list of all applications.
    expect(onFiltersChange).toHaveBeenLastCalledWith({ term: "t1" })
  })

  it.each([
    [
      "Move to waitlist",
      "Move selected to the waitlist",
      "Will be moved to the waitlist",
      "Move to the waitlist",
      "WAITLIST",
    ],
    ["Reject", "Reject selected applications", "Will be rejected", "Reject applications", "REJECT"],
  ])(
    "asks before %s, with the same labelled details, then goes back to all applications",
    async (action, title, namesLabel, submit, decision) => {
      setup()
      const user = userEvent.setup()
      await selectAll(user)
      await user.click(screen.getByRole("button", { name: action }))
      const dialog = await screen.findByRole("dialog", { name: title })
      expect(within(dialog).getByText("Selected")).toBeInTheDocument()
      expect(within(dialog).getByText("3 applications")).toBeInTheDocument()
      expect(within(dialog).getByText(namesLabel)).toBeInTheDocument()
      expect(within(dialog).getByText("Adam Test, Petr Test, and Jana Test")).toBeInTheDocument()
      expect(within(dialog).getByText(/Applies to this term only/)).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()

      await user.click(within(dialog).getByRole("button", { name: submit }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(post).toHaveBeenCalledWith("organizer/events/e1/terms/t1/bulk-decision", {
        json: { decision, applicationIds: ["a1", "a2", "a3"] },
      })
      expect(onFiltersChange).toHaveBeenLastCalledWith({ term: "t1" })
    },
  )

  it("changes nothing when the dialog is cancelled", async () => {
    setup()
    const user = userEvent.setup()
    await user.click(
      (await screen.findAllByRole("checkbox", { name: "Select application: Jana Test" }))[0]!,
    )
    await user.click(screen.getByRole("button", { name: "Reject" }))
    const dialog = await screen.findByRole("dialog", { name: "Reject selected applications" })
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(post).not.toHaveBeenCalled()
  })
})
