import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { CatalogEvent } from "@/features/catalog/api/catalog"
import { EventCard } from "@/features/catalog/components/EventCard"

/** `count` weekly terms from 2 Jan 2027, named "Week 1", "Week 2", … */
const makeEvent = (count: number): CatalogEvent => ({
  publicToken: "tok",
  name: "Summer camp",
  organizationId: "o1",
  organizationName: "Alpine Collective",
  location: "Lipno",
  terms: Array.from({ length: count }, (_, index) => {
    const start = new Date(Date.UTC(2027, 0, 2 + index * 7))
    const end = new Date(start.getTime() + 6 * 864e5)
    return {
      name: `Week ${index + 1}`,
      startsOn: start.toISOString().slice(0, 10),
      endsOn: end.toISOString().slice(0, 10),
    }
  }),
  termCount: count,
  fromPriceCzk: 4900,
  isOpenForApplications: true,
  hasPhoto: false,
})

async function renderCard(event: CatalogEvent) {
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventCard event={event} />,
  })
  const eventRoute = createRoute({
    getParentRoute: () => root,
    path: "/events/$publicToken",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page, eventRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole("heading", { name: "Summer camp" })
}

const listedTerms = () => within(screen.getByRole("list")).getAllByRole("listitem")

describe("EventCard terms (#732)", () => {
  it("lists up to three terms one under another with their names, nothing folded", async () => {
    await renderCard(makeEvent(3))

    expect(listedTerms()).toHaveLength(3)
    expect(screen.getByText("Week 1")).toBeInTheDocument()
    expect(screen.queryByText(/more terms?/)).not.toBeInTheDocument()
  })

  it("shows four terms in two columns and counts the rest from two hidden on", async () => {
    await renderCard(makeEvent(12))

    expect(listedTerms()).toHaveLength(4)
    expect(screen.getByRole("list")).toHaveClass("grid-cols-2")
    expect(screen.getByText("and 8 more terms")).toBeInTheDocument()
    expect(screen.queryByText("Week 1")).not.toBeInTheDocument()
  })

  it("counts 96 hidden terms of a hundred", async () => {
    await renderCard(makeEvent(100))

    expect(listedTerms()).toHaveLength(4)
    expect(screen.getByText("and 96 more terms")).toBeInTheDocument()
    expect(screen.getByText(/100 terms · from/)).toBeInTheDocument()
  })

  it("shows all five terms rather than hiding a single one", async () => {
    await renderCard(makeEvent(5))

    expect(listedTerms()).toHaveLength(5)
    expect(screen.queryByText(/more terms?/)).not.toBeInTheDocument()
  })

  it("stays a single link to the event page", async () => {
    await renderCard(makeEvent(12))

    expect(screen.getByRole("link")).toHaveAttribute("href", "/events/tok")
    await userEvent.tab()
    expect(screen.getByRole("link")).toHaveFocus()
  })
})
