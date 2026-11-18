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
vi.mock("@/lib/api-client", () => ({
  api: { get, post },
  apiErrorCode: (error: { code?: string }) => error?.code,
}))
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
  individualAccommodation: false,
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
  // The previews and results come from each test.
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

const breakdown = (total: number, FEMALE: number, MALE: number) => ({
  total,
  byGender: { FEMALE, MALE },
})
const sharedPreview = (confirm: number, waitlist: number, free: number) => ({
  selected: breakdown(confirm + waitlist, 0, confirm + waitlist),
  confirm: breakdown(confirm, 0, confirm),
  waitlist: breakdown(waitlist, 0, waitlist),
  freePlaces: { FEMALE: free, MALE: free },
  isShared: true,
})
/** The body of the last call that evaluated; a preview may be fetched again afterwards. */
const lastEvaluation = (): unknown =>
  (post.mock.calls as [string, unknown][])
    .filter(([path]) => path === "organizer/events/e1/terms/t1/bulk-evaluation")
    .at(-1)?.[1]
const json = (value: unknown) => ({ json: () => Promise.resolve(value) })

beforeEach(() => vi.clearAllMocks())
const selectAll = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole("checkbox", { name: /Select all in the filter/ }))
const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await selectAll(user)
  await user.click(screen.getByRole("button", { name: "Evaluate applications" }))
  return screen.findByRole("dialog", { name: "Evaluate selected applications" })
}

describe("evaluating the selected applications in one step (US-140)", () => {
  it("offers the action next to the two-step ones", async () => {
    setup()
    const user = userEvent.setup()
    await selectAll(user)
    expect(screen.getByRole("button", { name: "Evaluate applications" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move to waitlist" })).toBeInTheDocument()
  })

  it("shows how many are confirmed and how many become substitutes before anything changes, then evaluates", async () => {
    post.mockImplementation((path: string) =>
      json(
        path.endsWith("preview")
          ? sharedPreview(2, 1, 2)
          : { confirmed: ["a1", "a2"], waitlisted: ["a3"], unchanged: [] },
      ),
    )
    setup()
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    expect(await within(dialog).findByText("Will be confirmed")).toBeInTheDocument()
    expect(within(dialog).getByText(/ · 3 applications$/)).toBeInTheDocument()
    expect(within(dialog).getByText("Will become substitutes")).toBeInTheDocument()
    expect(within(dialog).getByText("2 free beds")).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "Confirmation and the order of substitutes follow the time of receipt.",
      ),
    ).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)

    await user.click(within(dialog).getByRole("button", { name: "Confirm evaluation" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(lastEvaluation()).toEqual({
      json: { applicationIds: ["a1", "a2", "a3"], expectedConfirmedCount: 2 },
    })
    // Back on the list of all applications.
    expect(onFiltersChange).toHaveBeenLastCalledWith({ term: "t1" })
  })

  it("splits the counts by gender when the beds are split by gender", async () => {
    post.mockImplementation(() =>
      json({
        selected: breakdown(20, 6, 14),
        confirm: breakdown(10, 4, 6),
        waitlist: breakdown(10, 2, 8),
        freePlaces: { FEMALE: 4, MALE: 6 },
        isShared: false,
      }),
    )
    setup()
    const dialog = await openDialog(userEvent.setup())

    expect(
      await within(dialog).findByText("Will be confirmed: 10 applications"),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Women 4 of 6 · men 6 of 14")).toBeInTheDocument()
    expect(within(dialog).getByText("Will become substitutes: 10 applications")).toBeInTheDocument()
    expect(within(dialog).getByText("Women 2 · men 8")).toBeInTheDocument()
    expect(within(dialog).getByText("10 free beds by group")).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        "4 women's beds and 6 men's beds. Both groups are evaluated in order of receipt.",
      ),
    ).toBeInTheDocument()
  })

  it("shows the new result to be confirmed again when the capacity changed meanwhile, and changes nothing before", async () => {
    let previews = 0
    post.mockImplementation(
      (path: string, options: { json: { expectedConfirmedCount?: number } }) => {
        if (path.endsWith("preview")) {
          return json(previews++ === 0 ? sharedPreview(10, 10, 10) : sharedPreview(8, 12, 8))
        }
        if (options.json.expectedConfirmedCount === 10) {
          return {
            json: () =>
              Promise.reject(
                Object.assign(new Error("changed"), { code: "EVALUATION_PLAN_CHANGED" }),
              ),
          }
        }
        return json({ confirmed: ["a1"], waitlisted: ["a2", "a3"], unchanged: [] })
      },
    )
    setup()
    const user = userEvent.setup()
    const dialog = await openDialog(user)
    await user.click(await within(dialog).findByRole("button", { name: "Confirm evaluation" }))

    const changed = await screen.findByRole("dialog", { name: "Capacity changed" })
    expect(
      await within(changed).findByText("The applications have not been changed yet."),
    ).toBeInTheDocument()
    expect(
      within(changed).getByText(
        "Free beds decreased from 10 to 8. Check the new numbers and confirm them.",
      ),
    ).toBeInTheDocument()
    expect(onFiltersChange).not.toHaveBeenCalled()

    await user.click(within(changed).getByRole("button", { name: "Confirm new result" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(lastEvaluation()).toEqual({
      json: { applicationIds: ["a1", "a2", "a3"], expectedConfirmedCount: 8 },
    })
  })

  it("changes nothing when the dialog is cancelled", async () => {
    post.mockImplementation(() => json(sharedPreview(2, 1, 2)))
    setup()
    const user = userEvent.setup()
    const dialog = await openDialog(user)
    await user.click(await within(dialog).findByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(post).toHaveBeenCalledTimes(1)
  })
})
