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
import { beforeEach, describe, expect, it, vi } from "vitest"

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
    },
  ],
  mealsDecided: false,
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
  beforeEach(() => get.mockReset())

  it("puts the badge of the board under the participant's data, not beside the name (360 px)", async () => {
    respondWith([application()])
    renderList(() => <span>Nové příspěvky</span>)

    const badge = await screen.findByText("Nové příspěvky")
    const heading = screen.getByRole("heading", { level: 3, name: /Jana Nováková/ })
    // In the column of the name it can never take width away from it (Figma C5).
    expect(heading.parentElement).toContainElement(badge)
    expect(heading.parentElement).not.toContainElement(screen.getByText("Unpaid"))
  })

  it("puts the badge of the board on each application", async () => {
    respondWith([application({ id: "a1" }), application({ id: "a2", firstName: "Adam" })])
    renderList((id) => <span>Nové příspěvky {id}</span>)

    expect(await screen.findByText("Nové příspěvky a1")).toBeVisible()
    expect(screen.getByText("Nové příspěvky a2")).toBeVisible()
  })

  it("shows a loading state first", async () => {
    get.mockReturnValue({ json: () => new Promise(() => undefined) })
    renderList()

    expect(await screen.findByRole("status")).toBeInTheDocument()
  })

  it("says what would appear when there is no application", async () => {
    respondWith([])
    renderList()

    expect(await screen.findByText(/You have no applications yet/)).toBeInTheDocument()
  })

  it("shows the error with a way to retry", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new Error("Boom")) })
    renderList()

    expect(await screen.findByText("Couldn't load your applications")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Try again|Retry/i })).toBeInTheDocument()
  })

  it("shows no payable amount when the domain returns no payment details", async () => {
    const data = application()
    respondWith([
      application({
        terms: data.terms.filter((term) => term.status === "WAITLISTED"),
        paymentDetails: null,
        amountOwedCzk: 4500,
      }),
    ])
    renderList()
    expect(await screen.findByRole("link")).toHaveTextContent("—")
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })

  it("lists every application with its variable symbol, term statuses and a link to the detail", async () => {
    respondWith([
      application(),
      application({
        id: "a2",
        eventName: "Horský víkend 2027",
        variableSymbol: "0051",
        code: "HV-0051",
      }),
    ])
    renderList()

    expect(await screen.findByRole("heading", { name: "Letní kemp 2027" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Horský víkend 2027" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /Jana Nováková · LKL-0048/ })).toBeVisible()
    expect(screen.getByRole("heading", { name: /Jana Nováková · HV-0051/ })).toBeVisible()
    expect(screen.getAllByText("4–10 Jul 2027")).toHaveLength(2)
    expect(screen.getAllByText("1. týden")).toHaveLength(2)
    expect(screen.getAllByText("Confirmed")).toHaveLength(2)
    expect(screen.getAllByText("Waitlisted")).toHaveLength(2)
    expect(screen.getAllByText("Unpaid")).toHaveLength(2)
    expect(screen.queryByText(/in line|position/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/participant/applications/a1")
  })

  it("shows the nearest unpaid term even off the first page and keeps the remaining reminders reachable", async () => {
    const user = userEvent.setup()
    const template = application()
    const reminder = (
      id: string,
      eventName: string,
      startsOn: string,
      endsOn: string,
    ): MyApplication =>
      application({
        id,
        eventName,
        terms: [
          { ...template.terms[0]!, startsOn, endsOn },
          // An earlier confirmed, paid term does not make this payment reminder more urgent.
          {
            ...template.terms[1]!,
            startsOn: "2099-01-01",
            endsOn: "2099-01-02",
            status: "CONFIRMED",
          },
        ],
        paymentDetails: {
          ...template.paymentDetails!,
          terms: [
            {
              termId: "t1",
              termNumber: 1,
              variableSymbol: "48001",
              dueCzk: 4500,
              paidCzk: 2000,
              owedCzk: 2500,
              paymentStatus: "PARTIALLY_PAID",
              paymentDeadline: null,
            },
            {
              termId: "t2",
              termNumber: 2,
              variableSymbol: "48002",
              dueCzk: 4900,
              paidCzk: 4900,
              owedCzk: 0,
              paymentStatus: "PAID",
              paymentDeadline: null,
            },
          ],
        },
      })
    respondWith([
      reminder("later", "Later event", "2099-05-01", "2099-05-03"),
      reminder("past", "Past event", "2000-05-01", "2000-05-03"),
      ...Array.from({ length: 18 }, (_, index) =>
        application({ id: `paid-${index}`, paymentDetails: null }),
      ),
      reminder("next", "Next event", "2099-04-01", "2099-04-03"),
    ])
    renderList()

    expect(await screen.findByRole("note")).toHaveTextContent("Next event")
    expect(screen.queryByRole("heading", { name: "Next event" })).not.toBeInTheDocument()
    const toggle = screen.getByRole("button", { name: "Show more (2)" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(screen.getAllByRole("note").map((note) => note.textContent)).toEqual([
      expect.stringContaining("Next event"),
      expect.stringContaining("Later event"),
      expect.stringContaining("Past event"),
    ])
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(toggle).toHaveFocus()
    await user.keyboard(" ")
    expect(screen.getByRole("note")).toHaveTextContent("Next event")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

  it("does not show a disclosure for a single payment reminder", async () => {
    respondWith([application()])
    renderList()

    expect(await screen.findByRole("note")).toBeVisible()
    expect(screen.queryByRole("button", { name: /show more/i })).not.toBeInTheDocument()
  })

  it("is one link whose parts follow the hierarchy: person and payment, terms with statuses, amounts", async () => {
    respondWith([application()])
    renderList()

    const link = await screen.findByRole("link")
    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(within(link).queryByRole("button")).not.toBeInTheDocument()
    const heading = within(link).getByRole("heading", { name: /Jana Nováková/ })
    const unpaid = within(link).getByText("Unpaid")
    const confirmed = within(link).getByText("Confirmed")
    const price = within(link).getByText("Term price")
    const follows = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(follows(heading, unpaid)).toBe(true)
    expect(follows(unpaid, confirmed)).toBe(true)
    expect(follows(confirmed, price)).toBe(true)
    // Each term row keeps its date next to its own status chip.
    const row = within(link).getByText("1. týden").closest("li")!
    expect(within(row).getByText("Confirmed")).toBeVisible()
    expect(within(row).queryByText("Waitlisted")).not.toBeInTheDocument()
    expect(within(link).getByText("Remaining to pay")).toBeInTheDocument()
  })

  it("clamps a very long name and term name, and keeps the full text available (#733)", async () => {
    const name = "Maximiliána".repeat(10)
    const termName = "Velmi dlouhý název termínu ".repeat(12)
    respondWith([
      application({
        firstName: name,
        lastName: "Nováková",
        terms: [{ ...application().terms[0]!, name: termName }],
      }),
    ])
    renderList()
    const link = await screen.findByRole("link")
    const heading = within(link).getByRole("heading", { level: 3 })
    expect(heading).toHaveAttribute("title", expect.stringContaining(name))
    expect(heading.querySelector(".line-clamp-2")).toHaveTextContent(name)
    const termLabel = within(link).getByTitle(termName.trim())
    expect(termLabel).toHaveClass("line-clamp-2", "wrap-anywhere")
    expect(termLabel).toHaveTextContent(termName.trim())
  })
})
