import type { ReactNode } from "react"
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplication } from "@/features/participant/api/applications"
import { ApplicationList } from "@/features/participant/components/ApplicationList"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const application = (overrides: Partial<MyApplication> = {}): MyApplication => ({
  id: "a1",
  eventName: "Letní kemp 2027",
  firstName: "Jana",
  lastName: "Nováková",
  code: "LKL-0048",
  variableSymbol: "48000",
  canSimulatePayment: false,
  simulatedPayments: [],
  terms: [
    {
      termId: "t1",
      name: "1. týden",
      startsOn: "2027-07-04",
      endsOn: "2027-07-10",
      status: "CONFIRMED",
      priceCzk: 4500,
      transportOffered: false,
      transportDecided: false,
      termEditable: true,
    },
    {
      termId: "t2",
      name: "2. týden",
      startsOn: "2027-07-11",
      endsOn: "2027-07-17",
      status: "WAITLISTED",
      priceCzk: 4900,
      transportOffered: false,
      transportDecided: false,
      termEditable: true,
    },
  ],
  mealsDecided: false,
  mealsEditable: true,
  healthDecided: false,
  amountDueCzk: 4500,
  amountPaidCzk: 0,
  amountOwedCzk: 4500,
  paymentStatus: "UNPAID",
  organizationContact: {
    name: "Letní kemp z. s.",
    email: "info@letni-kemp.example",
    phone: "+420 777 000 003",
  },
  paymentDetails: {
    bankAccount: "2900123456/2010",
    summary: { variableSymbol: "48000", payableCzk: 2500 },
    terms: [],
  },
  ...overrides,
})

const renderList = (renderBoardBadge?: (applicationId: string) => ReactNode) => {
  const root = createRootRoute({
    component: () => (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ApplicationList renderBoardBadge={renderBoardBadge} />
      </QueryClientProvider>
    ),
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/participant/applications/$applicationId",
  })
  const router = createRouter({
    routeTree: root.addChildren([detail]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

const respondWith = (value: unknown) => get.mockReturnValue({ json: () => Promise.resolve(value) })

describe("ApplicationList", () => {
  beforeEach(() => {
    get.mockReset()
    // The upcoming / past split reads today's date.
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-11-28T10:00:00Z"))
  })
  afterEach(() => vi.useRealTimers())

  it("puts the badge of the board under the participant's name, in the row", async () => {
    respondWith([application()])
    renderList(() => <span>Nové příspěvky</span>)

    const badge = await screen.findByText("Nové příspěvky")
    const row = screen.getByRole("link", { name: /Jana Nováková/ })
    const name = within(row).getByTitle("Jana Nováková")
    expect(name.parentElement).toContainElement(badge)
  })

  it("puts the badge of the board on each application", async () => {
    respondWith([application({ id: "a1" }), application({ id: "a2", firstName: "Adam" })])
    renderList((id) => <span>Nové příspěvky {id}</span>)

    expect(await screen.findByText("Nové příspěvky a1")).toBeVisible()
    expect(screen.getByText("Nové příspěvky a2")).toBeVisible()
  })

  it("shows a loading state under the title first", async () => {
    get.mockReturnValue({ json: () => new Promise(() => undefined) })
    renderList()

    expect(await screen.findByRole("status")).toHaveTextContent("Loading")
    expect(screen.getByRole("heading", { level: 1, name: "My applications" })).toBeVisible()
  })

  it("says what would appear when there is no application and leads to the catalog", async () => {
    respondWith([])
    renderList()

    expect(
      await screen.findByRole("heading", { name: "You don't have any applications yet" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Once you apply for an event, it will show up here.")).toBeVisible()
    expect(screen.getByRole("link", { name: "Find an event" })).toHaveAttribute("href", "/catalog")
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })

  it("shows the error with a way to retry", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("Boom")) })
    renderList()

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your applications")
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("has no to-do card when the domain returns no payment details", async () => {
    const data = application()
    respondWith([
      application({
        terms: data.terms.filter((term) => term.status === "WAITLISTED"),
        paymentDetails: null,
        amountOwedCzk: 4500,
      }),
    ])
    renderList()
    await screen.findByRole("link", { name: /Jana Nováková/ })
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })

  it("puts what is left to pay in one to-do card per application, with the way to the payment details", async () => {
    respondWith([application()])
    renderList()

    const note = await screen.findByRole("note")
    expect(within(note).getByText("CZK 2,500 left to pay")).toBeVisible()
    expect(within(note).getByRole("link", { name: "Payment details" })).toHaveAttribute(
      "href",
      "/participant/applications/a1",
    )
  })

  it("groups the applications by event in rows with the code, term dates and statuses", async () => {
    respondWith([
      application(),
      application({
        id: "a2",
        eventId: "e2",
        eventName: "Horský víkend 2027",
        variableSymbol: "0051",
        code: "HV-0051",
      }),
    ])
    renderList()

    const summer = await screen.findByRole("region", { name: "Letní kemp 2027" })
    const mountain = screen.getByRole("region", { name: "Horský víkend 2027" })
    expect(within(summer).getByText("Letní kemp z. s. · 4–17 Jul 2027")).toBeVisible()
    const row = within(summer).getByRole("link", { name: /Jana Nováková · LKL-0048/ })
    expect(row).toHaveAttribute("href", "/participant/applications/a1")
    expect(within(row).getByText("4–10 Jul")).toBeVisible()
    expect(within(row).getByText("Confirmed")).toBeVisible()
    expect(within(row).getByText("Waitlisted")).toBeVisible()
    expect(within(mountain).getByRole("link", { name: /HV-0051/ })).toBeVisible()
    expect(screen.queryByText(/in line|position/i)).not.toBeInTheDocument()
  })

  it("says Paid in the row once nothing is left, and nothing while something is owed", async () => {
    respondWith([
      application(),
      application({ id: "a2", code: "LKL-0049", paymentStatus: "PAID", paymentDetails: null }),
    ])
    renderList()

    expect(
      within(await screen.findByRole("link", { name: /LKL-0049/ })).getByText("Paid"),
    ).toBeVisible()
    expect(
      within(screen.getByRole("link", { name: /LKL-0048/ })).queryByText(/Paid|Unpaid/),
    ).not.toBeInTheDocument()
  })

  it("moves an application whose terms are over to the past tab", async () => {
    const user = userEvent.setup()
    respondWith([
      application(),
      application({
        id: "old",
        eventId: "e-old",
        eventName: "Kemp 2025",
        code: "K-0001",
        paymentDetails: null,
        terms: [{ ...application().terms[0]!, endsOn: "2025-07-10", status: "ARCHIVED" }],
      }),
    ])
    renderList()

    expect(await screen.findByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.queryByText("Kemp 2025")).not.toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "Past" }))
    expect(await screen.findByRole("region", { name: "Kemp 2025" })).toBeVisible()
    expect(screen.getByText("Archived")).toBeVisible()
    expect(screen.queryByText("Letní kemp 2027")).not.toBeInTheDocument()
  })

  it("keeps applications cancelled in every term behind a button", async () => {
    const user = userEvent.setup()
    respondWith([
      application(),
      application({
        id: "gone",
        code: "LKL-0050",
        paymentDetails: null,
        terms: application().terms.map((term) => ({ ...term, status: "CANCELLED" as const })),
      }),
    ])
    renderList()

    await screen.findByRole("link", { name: /LKL-0048/ })
    expect(screen.queryByRole("link", { name: /LKL-0050/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Show cancelled applications (1)" }))
    expect(screen.getByRole("link", { name: /LKL-0050/ })).toBeVisible()
    expect(screen.getByRole("button", { name: "Hide cancelled applications" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("clamps a very long name and keeps the full text available (#733)", async () => {
    const name = "Maximiliána".repeat(10)
    respondWith([application({ firstName: name, lastName: "Nováková" })])
    renderList()
    const link = await screen.findByRole("link", { name: new RegExp(name) })
    const title = within(link).getByTitle(`${name} Nováková`)
    expect(title).toHaveClass("line-clamp-2", "wrap-anywhere")
  })
})
