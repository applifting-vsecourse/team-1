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

import { CapacityPage } from "@/features/event-overview/components/CapacityPage"

const figures = (overrides: object) => ({
  capacity: 0,
  confirmed: 0,
  free: 0,
  waitlisted: 0,
  ...overrides,
})
const base = { id: "t1", name: "Letní turnus 1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

const gendered = {
  eventId: "e1",
  roomMode: "GENDERED",
  roomCount: 2,
  terms: [
    {
      ...base,
      ...figures({ capacity: 10, confirmed: 7, free: 3, waitlisted: 2 }),
      byGender: {
        FEMALE: figures({ capacity: 5, confirmed: 2, free: 3, waitlisted: 0 }),
        MALE: figures({ capacity: 5, confirmed: 5, free: 0, waitlisted: 4 }),
      },
    },
  ],
}
const shared = {
  eventId: "e1",
  roomMode: "SHARED",
  roomCount: 2,
  terms: [
    {
      ...base,
      ...figures({ capacity: 100, confirmed: 78, free: 22, waitlisted: 3 }),
      byGender: null,
    },
  ],
}

function renderPage(body: unknown, status = 200, termId?: string) {
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  )
  const rootRoute = createRootRoute()
  const page = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => (
      <CapacityPage
        eventId="e1"
        termId={termId}
      />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([page]),
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

describe("CapacityPage", () => {
  it("shows all gendered terms as whole-row links without a select or nested count links", async () => {
    renderPage(gendered)
    const row = await screen.findByRole("link", { name: /Letní turnus 1/ })
    expect(row).toHaveAttribute("href", "/organizer/events/e1/capacity?termId=t1")
    expect(row).toHaveTextContent("7 / 10")
    expect(row.querySelectorAll("a")).toHaveLength(0)
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "70")
  })

  it("shows one summary per term with shared rooms", async () => {
    renderPage(shared)
    const row = await screen.findByRole("link", { name: /Letní turnus 1/ })
    expect(row).toHaveAttribute("href", "/organizer/events/e1/capacity?termId=t1")
    expect(screen.getByText("22")).toBeTruthy()
  })

  it("opens the selected shared term with a progress bar, application links and a way back", async () => {
    renderPage(shared, 200, "t1")
    expect(await screen.findByRole("heading", { name: "Letní turnus 1" })).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "78")
    expect(screen.getByRole("link", { name: /Confirmed \/ capacity.*78 \/ 100/ })).toHaveAttribute(
      "href",
      "/organizer/events/e1/applications?term=t1&status=CONFIRMED",
    )
    expect(screen.getByRole("link", { name: "← All terms" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/capacity",
    )
  })

  it("does not silently open another term for a stale term URL", async () => {
    renderPage(shared, 200, "missing")
    expect(
      await screen.findByText("This term is no longer available. Return to the term overview."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })

  it.each([
    { capacity: 0, confirmed: 0, free: 0, expected: "0" },
    { capacity: 5, confirmed: 7, free: -2, expected: "100" },
  ])(
    "keeps the occupancy bar valid for $confirmed / $capacity",
    async ({ expected, ...counts }) => {
      renderPage({ ...shared, terms: [{ ...shared.terms[0], ...counts }] })
      expect(await screen.findByRole("progressbar")).toHaveAttribute("aria-valuenow", expected)
    },
  )

  it("shows an empty state without terms", async () => {
    renderPage({ ...shared, terms: [] })
    expect(await screen.findByText("The event has no active terms yet.")).toBeTruthy()
  })

  it("shows an error state", async () => {
    renderPage({ statusCode: 500, code: "INTERNAL", message: "Boom" }, 500)
    expect(await screen.findByRole("alert")).toBeTruthy()
  })
})
