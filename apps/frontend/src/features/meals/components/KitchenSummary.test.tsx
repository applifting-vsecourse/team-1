import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { KitchenTerm } from "@/features/meals/api/meals"
import { KitchenSummary } from "@/features/meals/components/KitchenSummary"

const terms: KitchenTerm[] = [
  {
    termId: "t1",
    name: "Summer week",
    startsOn: "2027-07-12",
    endsOn: "2027-07-19",
    total: 10,
    regular: 6,
    undecided: 2,
    options: [
      { id: "veg", name: "Vegetarian", count: 3 },
      { id: "gf", name: "Gluten-free", count: 2 },
    ],
    allergies: [
      { applicationId: "a1", firstName: "Adam", lastName: "Dvořák", allergies: "Peanuts" },
      { applicationId: "a2", firstName: "Jana", lastName: "Nováková", allergies: "Milk protein" },
    ],
    specialRequests: [
      {
        applicationId: "a1",
        firstName: "Adam",
        lastName: "Dvořák",
        specialRequest: "Early dinner",
      },
    ],
    stays: [
      {
        applicationId: "a1",
        firstName: "Adam",
        lastName: "Dvořák",
        lateArrival: "2027-07-13T10:30",
        earlyDeparture: "2027-07-18T16:00",
      },
      {
        applicationId: "a3",
        firstName: "Petr",
        lastName: "Svoboda",
        lateArrival: null,
        earlyDeparture: "2027-07-17T15:00",
      },
    ],
  },
  {
    termId: "t2",
    name: null,
    startsOn: "2027-08-02",
    endsOn: "2027-08-09",
    total: 1,
    regular: 1,
    undecided: 0,
    options: [
      { id: "veg", name: "Vegetarian", count: 0 },
      { id: "gf", name: "Gluten-free", count: 0 },
    ],
    allergies: [],
    specialRequests: [],
    stays: [],
  },
]

function renderPage(data: KitchenTerm[] = terms) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <KitchenSummary
        eventId="e1"
        eventName="Summer camp"
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

describe("KitchenSummary", () => {
  it("shows the counts and the allergies of the first term", async () => {
    renderPage()
    expect(await screen.findByRole("heading", { name: "Kitchen summary" })).toBeVisible()
    expect(screen.getByText("Summer camp · Meals")).toBeVisible()
    expect(screen.getByText("Regular meal · 6")).toBeVisible()
    expect(screen.getByText("Not filled in · 2")).toBeVisible()
    expect(screen.getByText("Vegetarian · 3")).toBeVisible()
    expect(screen.getByText("Gluten-free · 2")).toBeVisible()
    expect(screen.getByText("Restrictions may overlap.")).toBeVisible()
    expect(screen.getByText("Adam Dvořák · Peanuts")).toBeVisible()
    expect(screen.getByText("Jana Nováková · Milk protein")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Special requests" })).toBeVisible()
    expect(screen.getByText("Adam Dvořák · Early dinner")).toBeVisible()
  })

  it("shows the arrival and departure of the participants who gave them (US-143)", async () => {
    renderPage()
    expect(await screen.findByRole("heading", { name: "Arrivals and departures" })).toBeVisible()
    expect(screen.getByText("Arrival 13 Jul 2027 10:30")).toBeVisible()
    expect(screen.getByText("Departure 18 Jul 2027 16:00")).toBeVisible()
    expect(screen.getByText("Departure 17 Jul 2027 15:00")).toBeVisible()
    expect(screen.getAllByText(/^Arrival /)).toHaveLength(1)
  })

  it("switches the term", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole("combobox", { name: "Term" }))
    await user.click(await screen.findByRole("option", { name: /Aug 2027/ }))
    expect(screen.getByText("Regular meal · 1")).toBeVisible()
    expect(screen.queryByText("Adam Dvořák · Peanuts")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Special requests" })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Arrivals and departures" }),
    ).not.toBeInTheDocument()
  })

  it("prints the summary and links to the options", async () => {
    const user = userEvent.setup()
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined)
    renderPage()
    await user.click(await screen.findByRole("button", { name: "Print summary" }))
    expect(print).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: "Set up meal options" })).toHaveAttribute(
      "href",
      "/organizer/events/e1/meals/options",
    )
  })
})
