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

function renderPage(body: unknown, status = 200) {
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
    component: () => <CapacityPage eventId="e1" />,
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
  it("shows women and men separately, linking counts by term, status and gender", async () => {
    renderPage(gendered)
    const confirmedWomen = await screen.findByRole("link", { name: "2" })
    expect(confirmedWomen.getAttribute("href")).toContain("term=t1")
    expect(confirmedWomen.getAttribute("href")).toContain("status=CONFIRMED")
    expect(confirmedWomen.getAttribute("href")).toContain("gender=FEMALE")
    const waitlistedMen = screen.getByRole("link", { name: "4" })
    expect(waitlistedMen.getAttribute("href")).toContain("status=WAITLISTED")
    expect(waitlistedMen.getAttribute("href")).toContain("gender=MALE")
    expect(screen.getByText("3 free places")).toBeTruthy()
  })

  it("shows one summary per term with shared rooms", async () => {
    renderPage(shared)
    const waitlisted = await screen.findByRole("link", { name: "3" })
    expect(waitlisted.getAttribute("href")).toContain("status=WAITLISTED")
    expect(waitlisted.getAttribute("href")).not.toContain("gender")
    expect(screen.getByText("22")).toBeTruthy()
  })

  it("shows an empty state without terms", async () => {
    renderPage({ ...shared, terms: [] })
    expect(await screen.findByText("The event has no active terms yet.")).toBeTruthy()
  })

  it("shows an error state", async () => {
    renderPage({ statusCode: 500, code: "INTERNAL", message: "Boom" }, 500)
    expect(await screen.findByRole("alert")).toBeTruthy()
  })
})
