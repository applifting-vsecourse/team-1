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
  return screen.findByRole("dialog", { name: "Evaluate selected applications" })
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

    expect(await within(dialog).findByText("3 applications will be confirmed.")).toBeInTheDocument()
    expect(within(dialog).queryByRole("radio")).toBeNull()
    expect(within(dialog).queryByText(/beds are free/)).toBeNull()
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

  it("warns that not all fit and requires a choice for the rest, with nothing selected beforehand", async () => {
    post.mockImplementation((path: string) =>
      json(path.endsWith("preview") ? sharedPreview(2, 1, 2) : result()),
    )
    setup()
    const user = userEvent.setup()
    const dialog = await openDialog(user)

    expect(
      await within(dialog).findByText("You selected 3 applications, 2 beds are free."),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText("2 will be confirmed in order of application receipt."),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("What about the remaining 1?")).toBeInTheDocument()
    expect(within(dialog).getByRole("radio", { name: "Move to waitlist" })).not.toBeChecked()
    expect(within(dialog).getByRole("radio", { name: "Reject" })).not.toBeChecked()
    expect(within(dialog).getByRole("button", { name: "Evaluate" })).toBeDisabled()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["Move to waitlist", "WAITLIST", { waitlisted: ["a3"] }, "1 substitute"],
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

  it("lists a row per bed group when the beds are split by gender", async () => {
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
      await within(dialog).findByText("You selected 20 applications, 8 beds are free."),
    ).toBeInTheDocument()
    const rows = within(within(dialog).getByRole("list"))
      .getAllByRole("listitem")
      .map((li) => li.textContent)
    expect(rows).toEqual(["Women: 4 of 6 will be confirmed", "Men: 4 of 14 will be confirmed"])
    expect(
      within(dialog).getByText("Confirmed in order of application receipt."),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("What about the remaining 12?")).toBeInTheDocument()
  })

  it("shows the new result to be confirmed again when the capacity changed meanwhile, and changes nothing before", async () => {
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
    await user.click(await within(dialog).findByRole("radio", { name: "Move to waitlist" }))
    await user.click(within(dialog).getByRole("button", { name: "Evaluate" }))

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

    // The choice for the rest stays.
    expect(within(changed).getByRole("radio", { name: "Move to waitlist" })).toBeChecked()
    await user.click(within(changed).getByRole("button", { name: "Confirm new result" }))
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

describe("the warning declines both numbers (US-140)", () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"))
  })

  // The number before the noun is what the noun agrees with.
  const cases = [
    {
      selected: 1,
      free: 1,
      cs: "Vybrali jste 1 přihlášku, volné lůžko je 1.",
      en: "You selected 1 application, 1 bed is free.",
    },
    {
      selected: 2,
      free: 2,
      cs: "Vybrali jste 2 přihlášky, volná lůžka jsou 2.",
      en: "You selected 2 applications, 2 beds are free.",
    },
    {
      selected: 4,
      free: 4,
      cs: "Vybrali jste 4 přihlášky, volná lůžka jsou 4.",
      en: "You selected 4 applications, 4 beds are free.",
    },
    {
      selected: 5,
      free: 5,
      cs: "Vybrali jste 5 přihlášek, volných lůžek je 5.",
      en: "You selected 5 applications, 5 beds are free.",
    },
    {
      selected: 12,
      free: 2,
      cs: "Vybrali jste 12 přihlášek, volná lůžka jsou 2.",
      en: "You selected 12 applications, 2 beds are free.",
    },
    {
      selected: 21,
      free: 0,
      cs: "Vybrali jste 21 přihlášek, volných lůžek je 0.",
      en: "You selected 21 applications, 0 beds are free.",
    },
  ]

  it.each(cases)("selected $selected, free $free", async ({ selected, free, cs, en }) => {
    post.mockImplementation(() =>
      json({
        selected: breakdown(selected, 0, selected),
        confirm: breakdown(1, 0, 1),
        rest: breakdown(1, 0, 1),
        freePlaces: { FEMALE: free, MALE: free },
        isShared: true,
      }),
    )
    setup()
    const dialog = await openDialog(userEvent.setup())
    expect(await within(dialog).findByText(en)).toBeInTheDocument()
    await act(() => i18n.changeLanguage("cs"))
    expect(within(dialog).getByText(cs)).toBeInTheDocument()
  })

  it("agrees the row of a bed group and the description in Czech", async () => {
    post.mockImplementation(() =>
      json({
        selected: breakdown(12, 6, 6),
        confirm: breakdown(2, 1, 1),
        rest: breakdown(10, 5, 5),
        freePlaces: { FEMALE: 1, MALE: 1 },
        isShared: false,
      }),
    )
    setup()
    const dialog = await openDialog(userEvent.setup())
    await within(dialog).findByText("You selected 12 applications, 2 beds are free.")
    await act(() => i18n.changeLanguage("cs"))
    const rows = within(within(dialog).getByRole("list"))
      .getAllByRole("listitem")
      .map((li) => li.textContent)
    expect(rows).toEqual(["Ženy: potvrdí se 1 z 6", "Muži: potvrdí se 1 z 6"])
    expect(
      within(dialog).getByText("Potvrdí se podle pořadí přijetí přihlášky."),
    ).toBeInTheDocument()
  })

  it("says in Czech that the confirmed ones follow the order of receipt of the application", async () => {
    post.mockImplementation(() => json(sharedPreview(2, 1, 2)))
    setup()
    const dialog = await openDialog(userEvent.setup())
    await within(dialog).findByText("2 will be confirmed in order of application receipt.")
    await act(() => i18n.changeLanguage("cs"))
    expect(
      within(dialog).getByText("Potvrdí se 2 podle pořadí přijetí přihlášky."),
    ).toBeInTheDocument()
  })

  it.each([
    {
      count: 1,
      title: "Vyhodnocena 1 přihláška",
      confirmed: "1 potvrzená",
      rejected: "1 zamítnutá",
      substitutes: "1 náhradník",
      question: "Co se zbylou 1?",
    },
    {
      count: 2,
      title: "Vyhodnoceny 2 přihlášky",
      confirmed: "2 potvrzené",
      rejected: "2 zamítnuté",
      substitutes: "2 náhradníci",
      question: "Co se zbylými 2?",
    },
    {
      count: 5,
      title: "Vyhodnoceno 5 přihlášek",
      confirmed: "5 potvrzených",
      rejected: "5 zamítnutých",
      substitutes: "5 náhradníků",
      question: "Co se zbylými 5?",
    },
  ])("declines the result and the question for $count in Czech", async ({ count, ...expected }) => {
    await act(() => i18n.changeLanguage("cs"))
    const t = i18n.getFixedT("cs", "eventOverview")
    expect(t("bulkEvaluation.doneTitle", { count })).toBe(expected.title)
    expect(t("bulkEvaluation.doneConfirmed", { count })).toBe(expected.confirmed)
    expect(t("bulkEvaluation.doneRejected", { count })).toBe(expected.rejected)
    expect(t("bulkEvaluation.doneSubstitutes", { count })).toBe(expected.substitutes)
    expect(t("bulkEvaluation.restQuestion", { count })).toBe(expected.question)
  })
})
