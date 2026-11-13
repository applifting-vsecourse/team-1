import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { type Attention } from "@/features/event-overview/api/attention"
import { EventOverview } from "@/features/event-overview/components/EventOverview"

const occupancy = {
  eventId: "e1",
  terms: [
    {
      id: "t1",
      name: "Summer week",
      startsOn: "2027-07-01",
      endsOn: "2027-07-07",
      roomMode: "SHARED",
      roomCount: 2,
      capacity: 50,
      confirmed: 48,
      free: 2,
      waitlisted: 6,
      byGender: null,
    },
  ],
}

const proposal = (overrides: object = {}) => ({
  termId: "t1",
  termName: null,
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  group: "MALE",
  freeBeds: 1,
  substitute: {
    applicationId: "a1",
    firstName: "Adam",
    lastName: "Dvořák",
    gender: "MALE",
    priceCzk: 4900,
  },
  ...overrides,
})

function renderOverview(attention: Attention, setup?: ReactNode, proposals: object[] = []) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input instanceof Request ? input.url : input)
    const body = url.endsWith("/attention")
      ? attention
      : url.endsWith("/substitute-proposals")
        ? proposals
        : occupancy
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <EventOverview
        eventId="e1"
        events={[{ id: "e1", name: "Summer camp" }]}
        onEventChange={() => undefined}
        setup={setup}
      />
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
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

afterEach(() => vi.restoreAllMocks())

describe("EventOverview", () => {
  it("shows a card with a count per kind of work, each linking to the list filtered by it", async () => {
    renderOverview({
      toEvaluateCount: 12,
      substituteCount: 3,
      debt: { debtorCount: 6, overdueCount: 3, totalDebtCzk: 18400 },
      changeRequestCount: 2,
    })
    const toEvaluate = await screen.findByRole("link", { name: /Awaiting review · 12/ })
    expect(toEvaluate.getAttribute("href")).toContain("status=TO_EVALUATE")
    const substitutes = screen.getByRole("link", { name: /Substitutes to resolve · 3/ })
    expect(substitutes).toHaveTextContent("Freed beds in the matching group")
    expect(substitutes.getAttribute("href")).toContain("status=WAITLISTED")
    expect(substitutes.getAttribute("href")).toContain("waitlist=FREE_BED")
    const debt = screen.getByRole("link", { name: /Participants with a balance due · 6/ })
    expect(debt).toHaveTextContent("3 overdue · Total balance due")
    expect(debt).toHaveTextContent("18,400")
    expect(debt.getAttribute("href")).toContain("payment=DEBT")
    const requests = screen.getByRole("link", { name: /Requests awaiting approval · 2/ })
    expect(requests.getAttribute("href")).toContain("view=CHANGE_REQUESTS")
    expect(await screen.findByText("Summer week")).toBeVisible()
    expect(screen.getByRole("combobox", { name: "Event" })).toBeVisible()
  })

  it("still shows the cards, with zero counts, when nothing needs attention", async () => {
    renderOverview({
      toEvaluateCount: 0,
      substituteCount: 0,
      debt: { debtorCount: 0, overdueCount: 0, totalDebtCzk: 0 },
      changeRequestCount: 0,
    })
    expect(await screen.findByRole("link", { name: /Awaiting review · 0/ })).toBeVisible()
    expect(screen.getByRole("link", { name: /Substitutes to resolve · 0/ })).toBeVisible()
    expect(screen.queryByText("Nothing needs your attention")).not.toBeInTheDocument()
    expect(await screen.findByText("Summer week")).toBeVisible()
  })

  it("puts the setup steps the event still needs between the switcher and the cards", async () => {
    renderOverview(
      {
        toEvaluateCount: 0,
        substituteCount: 0,
        debt: { debtorCount: 0, overdueCount: 0, totalDebtCzk: 0 },
        changeRequestCount: 0,
      },
      <p>Setup steps</p>,
    )
    const cards = await screen.findByRole("link", { name: /Awaiting review/ })
    const setup = screen.getByText("Setup steps")
    const switcher = screen.getByRole("combobox", { name: "Event" })
    expect(switcher.compareDocumentPosition(setup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(setup.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("shows a banner per term with the proposed substitute and the way to confirm (US-31)", async () => {
    renderOverview(
      {
        toEvaluateCount: 0,
        substituteCount: 1,
        debt: { debtorCount: 0, overdueCount: 0, totalDebtCzk: 0 },
        changeRequestCount: 0,
      },
      undefined,
      [
        proposal(),
        proposal({
          group: "FEMALE",
          substitute: {
            applicationId: "a2",
            firstName: "Jana",
            lastName: "Nováková",
            gender: "FEMALE",
            priceCzk: 4900,
          },
        }),
      ],
    )
    const banner = await screen.findByRole("alert")
    expect(banner).toHaveTextContent("A bed was freed or added in the term 12–18 Jul 2027")
    expect(banner).toHaveTextContent(
      "Adam Dvořák is the first suitable substitute for the men's bed.",
    )
    expect(banner).toHaveTextContent(
      "Jana Nováková is the first suitable substitute for the women's bed.",
    )
    const link = screen.getByRole("link", { name: "Go to confirmation" })
    expect(link.getAttribute("href")).toContain("status=WAITLISTED")
    expect(link.getAttribute("href")).toContain("term=t1")
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })

  it("shows no banner without a proposal", async () => {
    renderOverview({
      toEvaluateCount: 0,
      substituteCount: 0,
      debt: { debtorCount: 0, overdueCount: 0, totalDebtCzk: 0 },
      changeRequestCount: 0,
    })
    await screen.findByRole("link", { name: /Awaiting review/ })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
