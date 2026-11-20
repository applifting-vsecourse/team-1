import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, configure, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import { ApplicationsPage } from "@/features/event-overview/components/ApplicationsPage"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

const { get, post, notifySuccess } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  notifySuccess: vi.fn(),
}))
vi.mock("@/lib/notify", () => ({ notify: { success: notifySuccess } }))
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
const sharedPreview = (confirm: number, rest: number, free: number) => ({
  selected: breakdown(confirm + rest, 0, confirm + rest),
  confirm: breakdown(confirm, 0, confirm),
  rest: breakdown(rest, 0, rest),
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
  return screen.findByRole("dialog", { name: /^Evaluate \d+ applications?$/ })
}

const result = (overrides = {}) => ({
  confirmed: [],
  waitlisted: [],
  rejected: [],
  unchanged: [],
  ...overrides,
})

describe("evaluating the selected applications in one step (US-140)", () => {
  it("offers the action next to the two-step ones", async () => {
    setup()
    const user = userEvent.setup()
    await selectAll(user)
    expect(screen.getByRole("button", { name: "Evaluate applications" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Move to waitlist" })).toBeInTheDocument()
  })

  it("offers no choice when everybody fits, and evaluates straight away", async () => {
    post.mockImplementation((path: string) =>
      json(
        path.endsWith("preview")
          ? sharedPreview(3, 0, 5)
          : result({ confirmed: ["a1", "a2", "a3"] }),
      ),
    )
    setup()
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    expect(await within(dialog).findByText("All 3 will be confirmed.")).toBeInTheDocument()
    expect(within(dialog).queryByRole("radio")).toBeNull()
    expect(within(dialog).queryByRole("alert")).toBeNull()
    const submit = within(dialog).getByRole("button", { name: "Evaluate" })
    expect(submit).toBeEnabled()

    await user.click(submit)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(lastEvaluation()).toEqual({
      json: { applicationIds: ["a1", "a2", "a3"], expectedConfirmed: { FEMALE: 0, MALE: 3 } },
    })
    // Back on the list of all applications.
    expect(onFiltersChange).toHaveBeenLastCalledWith({ term: "t1" })
  })

  it("says how many of the selected are confirmed and requires a choice for the rest, with nothing selected beforehand", async () => {
    post.mockImplementation((path: string) =>
      json(path.endsWith("preview") ? sharedPreview(2, 1, 2) : result()),
    )
    setup()
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    expect(
      await within(dialog).findByText("2 of 3 will be confirmed in order of application receipt."),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Remaining 1:")).toBeInTheDocument()
    expect(within(dialog).getByRole("radio", { name: "Waitlist" })).not.toBeChecked()
    expect(within(dialog).getByRole("radio", { name: "Reject" })).not.toBeChecked()
    expect(within(dialog).getByRole("button", { name: "Evaluate" })).toBeDisabled()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["Waitlist", "WAITLIST", { waitlisted: ["a3"] }, "1 substitute"],
    ["Reject", "REJECT", { rejected: ["a3"] }, "1 rejected"],
  ])(
    "evaluates after choosing %s for the rest and tells the split",
    async (option, rest, overrides, restText) => {
      post.mockImplementation((path: string) =>
        json(
          path.endsWith("preview")
            ? sharedPreview(2, 1, 2)
            : result({ confirmed: ["a1", "a2"], ...overrides }),
        ),
      )
      setup()
      const user = userEvent.setup()
      const dialog = await openDialog(user)
      await user.click(await within(dialog).findByRole("radio", { name: option }))
      await user.click(within(dialog).getByRole("button", { name: "Evaluate" }))

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(lastEvaluation()).toEqual({
        json: {
          applicationIds: ["a1", "a2", "a3"],
          expectedConfirmed: { FEMALE: 0, MALE: 2 },
          rest,
        },
      })
      expect(onFiltersChange).toHaveBeenLastCalledWith({ term: "t1" })
      expect(notifySuccess).toHaveBeenCalledWith(
        "3 applications evaluated",
        `2 confirmed · ${restText}`,
      )
    },
  )

  it("shows the same totals when the beds are split by gender", async () => {
    post.mockImplementation(() =>
      json({
        selected: breakdown(20, 6, 14),
        confirm: breakdown(8, 4, 4),
        rest: breakdown(12, 2, 10),
        freePlaces: { FEMALE: 4, MALE: 4 },
        isShared: false,
      }),
    )
    setup()
    const dialog = await openDialog(userEvent.setup())

    expect(
      await within(dialog).findByText("8 of 20 will be confirmed in order of application receipt."),
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole("list")).toBeNull()
    expect(within(dialog).queryByText(/Women|Men/)).toBeNull()
    expect(within(dialog).getByText("Remaining 12:")).toBeInTheDocument()
  })

  it("says when none of the selected is confirmed", async () => {
    post.mockImplementation(() => json(sharedPreview(0, 3, 0)))
    setup()
    const dialog = await openDialog(userEvent.setup())
    expect(await within(dialog).findByText("None of 3 will be confirmed.")).toBeInTheDocument()
  })

  it("shows one sentence and the new result when the capacity changed meanwhile, and changes nothing before", async () => {
    let previews = 0
    post.mockImplementation(
      (path: string, options: { json: { expectedConfirmed?: { MALE: number } } }) => {
        if (path.endsWith("preview")) {
          return json(previews++ === 0 ? sharedPreview(10, 10, 10) : sharedPreview(8, 12, 8))
        }
        if (options.json.expectedConfirmed?.MALE === 10) {
          return {
            json: () =>
              Promise.reject(
                Object.assign(new Error("changed"), { code: "EVALUATION_PLAN_CHANGED" }),
              ),
          }
        }
        return json(result({ confirmed: ["a1"], waitlisted: ["a2", "a3"] }))
      },
    )
    setup()
    const user = userEvent.setup()
    const dialog = await openDialog(user)
    await user.click(await within(dialog).findByRole("radio", { name: "Waitlist" }))
    await user.click(within(dialog).getByRole("button", { name: "Evaluate" }))

    expect(
      await within(dialog).findByText("The free beds changed meanwhile. Check the new numbers."),
    ).toBeInTheDocument()
    expect(
      await within(dialog).findByText("8 of 20 will be confirmed in order of application receipt."),
    ).toBeInTheDocument()
    expect(onFiltersChange).not.toHaveBeenCalled()

    // The choice for the rest stays.
    expect(within(dialog).getByRole("radio", { name: "Waitlist" })).toBeChecked()
    await user.click(within(dialog).getByRole("button", { name: "Evaluate" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(lastEvaluation()).toEqual({
      json: {
        applicationIds: ["a1", "a2", "a3"],
        expectedConfirmed: { FEMALE: 0, MALE: 8 },
        rest: "WAITLIST",
      },
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

describe("the dialog declines its counts (US-140)", () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"))
  })

  // The number before the noun is what the noun agrees with.
  const cases = [
    {
      count: 1,
      title: "Vyhodnotit 1 přihlášku",
      rest: "Zbývá 1:",
      all: "Potvrdí se 1.",
      doneTitle: "Vyhodnocena 1 přihláška",
      confirmed: "1 potvrzená",
      rejected: "1 zamítnutá",
      substitutes: "1 náhradník",
    },
    {
      count: 2,
      title: "Vyhodnotit 2 přihlášky",
      rest: "Zbylé 2:",
      all: "Potvrdí se všech 2.",
      doneTitle: "Vyhodnoceny 2 přihlášky",
      confirmed: "2 potvrzené",
      rejected: "2 zamítnuté",
      substitutes: "2 náhradníci",
    },
    {
      count: 5,
      title: "Vyhodnotit 5 přihlášek",
      rest: "Zbylých 5:",
      all: "Potvrdí se všech 5.",
      doneTitle: "Vyhodnoceno 5 přihlášek",
      confirmed: "5 potvrzených",
      rejected: "5 zamítnutých",
      substitutes: "5 náhradníků",
    },
    {
      count: 8,
      title: "Vyhodnotit 8 přihlášek",
      rest: "Zbylých 8:",
      all: "Potvrdí se všech 8.",
      doneTitle: "Vyhodnoceno 8 přihlášek",
      confirmed: "8 potvrzených",
      rejected: "8 zamítnutých",
      substitutes: "8 náhradníků",
    },
  ]

  it.each(cases)("in Czech for $count", async ({ count, ...expected }) => {
    await act(() => i18n.changeLanguage("cs"))
    const t = i18n.getFixedT("cs", "eventOverview")
    expect(t("bulkEvaluation.title", { count })).toBe(expected.title)
    expect(t("bulkEvaluation.restQuestion", { count })).toBe(expected.rest)
    expect(t("bulkEvaluation.confirmAll", { count })).toBe(expected.all)
    expect(t("bulkEvaluation.doneTitle", { count })).toBe(expected.doneTitle)
    expect(t("bulkEvaluation.doneConfirmed", { count })).toBe(expected.confirmed)
    expect(t("bulkEvaluation.doneRejected", { count })).toBe(expected.rejected)
    expect(t("bulkEvaluation.doneSubstitutes", { count })).toBe(expected.substitutes)
  })

  it("shows the Czech title, warning and choice on screen", async () => {
    post.mockImplementation(() => json(sharedPreview(10, 10, 10)))
    setup()
    const dialog = await openDialog(userEvent.setup())
    await within(dialog).findByText("10 of 20 will be confirmed in order of application receipt.")
    await act(() => i18n.changeLanguage("cs"))
    expect(screen.getByRole("dialog", { name: "Vyhodnotit 20 přihlášek" })).toBeInTheDocument()
    expect(
      within(dialog).getByText("Potvrdí se 10 z 20 podle pořadí přijetí přihlášky."),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Zbylých 10:")).toBeInTheDocument()
    expect(within(dialog).getByRole("radio", { name: "Mezi náhradníky" })).toBeInTheDocument()
    expect(within(dialog).getByRole("radio", { name: "Zamítnout" })).toBeInTheDocument()
  })
})
