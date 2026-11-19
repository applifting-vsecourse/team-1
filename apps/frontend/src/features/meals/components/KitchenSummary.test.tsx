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

/** A table row with exactly these cells. */
function expectRow(...cells: string[]) {
  const rows = screen.getAllByRole("row").filter(
    (row) =>
      within(row)
        .queryAllByRole("cell")
        .map((cell) => cell.textContent)
        .join("|") === cells.join("|"),
  )
  expect(rows).toHaveLength(1)
}

afterEach(() => vi.restoreAllMocks())

describe("KitchenSummary", () => {
  it("shows the counts and the allergies of the first term", async () => {
    renderPage()
    expect(await screen.findByRole("heading", { name: "Kitchen summary" })).toBeVisible()
    expect(screen.getByText("Summer camp · Meals")).toBeVisible()
    expect(screen.getByRole("heading", { name: "10 confirmed participants" })).toBeVisible()
    expect(screen.getByText("Each participant is counted once.")).toBeVisible()
    expect(screen.getByRole("link", { name: "Back to event overview" })).toHaveAttribute(
      "href",
      "/organizer/events/e1",
    )
    expectRow("Regular meal", "6")
    expectRow("Vegetarian", "3")
    expectRow("Gluten-free", "2")
    expect(screen.getByText("Restrictions may overlap.")).toBeVisible()
    expectRow("Adam Dvořák", "Peanuts")
    expectRow("Jana Nováková", "Milk protein")
    expect(screen.getByRole("button", { name: "Special requests · 1" })).toBeVisible()
    expectRow("Adam Dvořák", "Early dinner")
  })

  it("shows the arrival and departure of the participants who gave them (US-143)", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: "Arrivals and departures · 2" })).toBeVisible()
    expectRow("Adam Dvořák", "13 Jul 2027 10:30", "18 Jul 2027 16:00")
    expectRow("Petr Svoboda", "–", "17 Jul 2027 15:00")
  })

  it("shows the item count in each section header and starts expanded", async () => {
    renderPage()
    for (const name of [
      "Meal counts · 10",
      "Allergies · 2",
      "Special requests · 1",
      "Arrivals and departures · 2",
    ]) {
      expect(await screen.findByRole("button", { name })).toHaveAttribute("aria-expanded", "true")
    }
  })

  it("collapses and expands a section on its own", async () => {
    const user = userEvent.setup()
    renderPage()
    const allergies = await screen.findByRole("button", { name: "Allergies · 2" })
    await user.click(allergies)
    expect(allergies).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: "Special requests · 1" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    // Closed content stays in the DOM (hidden by a class that print undoes), so print shows it all.
    expect(screen.getByText("Peanuts").closest("[data-slot=accordion-content]")).toHaveAttribute(
      "data-state",
      "closed",
    )
    await user.click(allergies)
    expect(allergies).toHaveAttribute("aria-expanded", "true")
  })

  it("groups all notes by application, including namesakes and participants with only a departure", async () => {
    const user = userEvent.setup()
    renderPage([
      {
        ...terms[0]!,
        stays: [
          ...terms[0]!.stays,
          {
            applicationId: "a4",
            firstName: "Adam",
            lastName: "Dvořák",
            lateArrival: "2027-07-14T12:00",
            earlyDeparture: null,
          },
        ],
      },
      terms[1]!,
    ])
    await user.click(await screen.findByRole("combobox", { name: "View" }))
    await user.click(await screen.findByRole("option", { name: "By participant" }))
    const people = within(screen.getByRole("table", { name: "Allergies and other requests" }))
    const firstAdam = within(people.getByRole("row", { name: /Adam Dvořák.*Peanuts/ }))
    expect(firstAdam.getByText("Early dinner")).toBeVisible()
    expect(firstAdam.getByText("Arrival 13 Jul 2027 10:30")).toBeVisible()
    expect(firstAdam.getByText("Departure 18 Jul 2027 16:00")).toBeVisible()
    expect(firstAdam.queryByText("Arrival 14 Jul 2027 12:00")).not.toBeInTheDocument()
    expect(
      people.getByRole("row", { name: /Adam Dvořák.*Arrival 14 Jul 2027 12:00/ }),
    ).toBeVisible()
    expect(
      people.getByRole("row", { name: /Petr Svoboda.*Departure 17 Jul 2027 15:00/ }),
    ).toBeVisible()
    expect(
      screen.queryByRole("button", { name: /^Arrivals and departures/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Allergies and other requests · 4" })).toBeVisible()
    await user.click(screen.getByRole("combobox", { name: "Term" }))
    await user.click(await screen.findByRole("option", { name: /Aug 2027/ }))
    expect(screen.getByRole("button", { name: "Allergies and other requests · 0" })).toBeVisible()
    expect(screen.queryByText("Petr Svoboda")).not.toBeInTheDocument()
    expectRow("Regular meal", "1")
  })

  it("switches the term", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole("combobox", { name: "Term" }))
    await user.click(await screen.findByRole("option", { name: /Aug 2027/ }))
    expectRow("Regular meal", "1")
    expect(screen.queryByText("Peanuts")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Special requests/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /^Arrivals and departures/ }),
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
