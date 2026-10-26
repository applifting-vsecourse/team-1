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

function renderPage(
  body: unknown,
  status = 200,
  props: { termId?: string; rooms?: { gender: "FEMALE" | "MALE" | null; capacity: number }[] } = {},
) {
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
        {...props}
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
  it("lists every term with bars for women and men and no percent text", async () => {
    renderPage(gendered)

    expect(await screen.findByRole("heading", { name: "Occupancy of all terms" })).toBeVisible()
    expect(screen.getByText("2 / 5")).toBeVisible()
    expect(screen.getByText("5 / 5")).toBeVisible()
    expect(screen.getAllByRole("progressbar")).toHaveLength(2)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("makes the whole row a link to the term detail", async () => {
    renderPage(gendered)

    const row = await screen.findByRole("link", { name: /Letní turnus 1/ })
    expect(row.getAttribute("href")).toContain("termId=t1")
    // The numbers are not links of their own.
    expect(screen.queryByRole("link", { name: "2" })).not.toBeInTheDocument()
  })

  it("shows one bar and the free places per term with shared rooms", async () => {
    renderPage(shared)

    expect(await screen.findByText("78 / 100")).toBeVisible()
    expect(screen.getByText("22")).toBeVisible()
    expect(screen.getAllByRole("progressbar")).toHaveLength(1)
  })

  it("opens the detail of a term with cards linking to the confirmed applications", async () => {
    renderPage(gendered, 200, {
      termId: "t1",
      rooms: [
        { gender: "FEMALE", capacity: 5 },
        { gender: "MALE", capacity: 5 },
      ],
    })

    expect(await screen.findByRole("heading", { name: "Letní turnus 1" })).toBeVisible()
    expect(screen.getByRole("link", { name: "← All terms" }).getAttribute("href")).not.toContain(
      "termId",
    )
    const women = screen.getByRole("link", { name: /Women · capacity 5 beds/ })
    expect(women).toHaveTextContent("2 / 5")
    expect(women).toHaveTextContent("3 free places · 1 women’s room of 5 beds")
    for (const part of ["term=t1", "status=CONFIRMED", "gender=FEMALE"]) {
      expect(women.getAttribute("href")).toContain(part)
    }
    expect(screen.getByRole("link", { name: /Total term capacity/ })).toHaveTextContent("7 / 10")
    expect(screen.getByText("Free places for women cannot be used for men.")).toBeVisible()
    expect(screen.getByText(/3 places left in total, all for women/)).toBeVisible()
  })

  it("warns when more are confirmed than there are beds", async () => {
    const over = structuredClone(gendered)
    over.terms[0]!.byGender.MALE = figures({ capacity: 5, confirmed: 6, free: -1, waitlisted: 0 })
    renderPage(over, 200, { termId: "t1" })

    expect(await screen.findByText("Term capacity exceeded")).toBeVisible()
    expect(screen.getByText(/Men: 6 confirmed for 5 beds/)).toBeVisible()
  })

  it("explains an unfinished event without terms and offers to add one", async () => {
    renderPage({ ...shared, terms: [] })
    expect(await screen.findByText("The event is not finished yet")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Add term and price" })).toBeTruthy()
    expect(screen.queryByText(/Capacity comes from the beds/)).toBeNull()
  })

  it("explains an unfinished event without rooms instead of showing empty bars", async () => {
    renderPage({ ...gendered, roomCount: 0 })
    expect(await screen.findByText("The event is not finished yet")).toBeTruthy()
    expect(screen.getByText(/no rooms/)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Add room" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Add term and price" })).toBeNull()
  })

  it("shows an error state", async () => {
    renderPage({ statusCode: 500, code: "INTERNAL", message: "Boom" }, 500)
    expect(await screen.findByRole("alert")).toBeTruthy()
  })
})
