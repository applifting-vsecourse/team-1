import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
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

// The card sums its terms up in one line (#795), so a long list can't grow it (#732).
const datesLines = () => screen.getAllByText(/\d+ terms? · /)

describe("EventCard terms (#732)", () => {
  it("sums up to three terms in one line, nothing folded", async () => {
    await renderCard(makeEvent(3))

    expect(datesLines()).toHaveLength(1)
    expect(screen.getByText("3 terms · January 2027")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(screen.queryByText(/more terms?/)).not.toBeInTheDocument()
  })

  it("keeps twelve terms in that one line without listing their dates", async () => {
    await renderCard(makeEvent(12))

    expect(datesLines()).toHaveLength(1)
    expect(screen.getByText("12 terms · January–March 2027")).toBeInTheDocument()
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
    expect(screen.queryByText("Week 1")).not.toBeInTheDocument()
  })

  it("counts all hundred terms and shows the lowest price", async () => {
    await renderCard(makeEvent(100))

    expect(datesLines()).toHaveLength(1)
    expect(screen.getByText("100 terms · January 2027–December 2028")).toBeInTheDocument()
    expect(screen.getByRole("link")).toHaveTextContent("from CZK 4,900 / participant")
  })

  it("counts five terms rather than hiding a single one", async () => {
    await renderCard(makeEvent(5))

    expect(screen.getByText("5 terms · January–February 2027")).toBeInTheDocument()
    expect(screen.queryByText(/more terms?/)).not.toBeInTheDocument()
  })

  it("stays a single link to the event page", async () => {
    await renderCard(makeEvent(12))

    expect(screen.getByRole("link")).toHaveAttribute("href", "/events/tok")
    await userEvent.tab()
    expect(screen.getByRole("link")).toHaveFocus()
  })
})

// System B (2026-11-27): HF/01 catalog 22640:12072, Datovka 27719:4271, Cenovka 27719:4276.
describe("EventCard brand markers", () => {
  it("shows the first term as a date tile in the photo corner, hidden from screen readers", async () => {
    await renderCard(makeEvent(3))

    const tile = document.querySelector('[data-slot="date-tile"]')
    expect(tile).toHaveTextContent("Jan2")
    expect(tile).toHaveAttribute("aria-hidden", "true")
    expect(tile).toHaveClass("absolute", "top-3", "right-3", "border-border-strong", "bg-card")
    expect(tile?.firstElementChild).toHaveClass("bg-brand-warm", "text-brand-warm-foreground")
  })

  it("says the date of the tile in text for screen readers when the card has several terms", async () => {
    await renderCard(makeEvent(3))

    expect(screen.getByText("First term starts 2 Jan 2027")).toHaveClass("sr-only")
  })

  it("leaves the tile's date to the visible dates line when there is one term", async () => {
    await renderCard(makeEvent(1))

    expect(screen.queryByText(/First term starts/)).not.toBeInTheDocument()
  })

  it("draws the placeholder symbol of an event without a photo in the logo colour", async () => {
    await renderCard({ ...makeEvent(1), hasPhoto: false })

    expect(document.querySelector("svg")).toHaveClass("text-logo-symbol")
  })

  it("puts the price in an orange price tag with ink text and no edge, the per-participant note beside it", async () => {
    await renderCard(makeEvent(3))

    const tag = document.querySelector('[data-slot="price-tag"]')
    expect(tag).toHaveTextContent("from CZK 4,900")
    expect(tag).toHaveClass("bg-brand-warm", "text-brand-warm-foreground")
    expect(tag?.className).not.toMatch(/border/)
    expect(tag?.parentElement).toHaveTextContent("from CZK 4,900 / participant")
  })

  it("marks open applications with a tonal positive pill, not the teal action colour", async () => {
    await renderCard(makeEvent(1))

    const status = screen.getByText("Applications open")
    expect(status).toHaveClass("bg-status-success-bg")
    expect(status.innerHTML).not.toMatch(/bg-primary/)
  })

  it("has no date tile for an event without terms", async () => {
    await renderCard({ ...makeEvent(0), fromPriceCzk: null })

    expect(document.querySelector('[data-slot="date-tile"]')).not.toBeInTheDocument()
  })
})
