import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { CatalogEventDetail } from "@/features/catalog/api/catalog"
import { EventPage } from "@/features/catalog/components/EventPage"

const event: CatalogEventDetail = {
  publicToken: "tok123",
  name: "Letní kemp Lipno 2027",
  organizationName: "Alpine Collective",
  description: "Týden v přírodě.\n\nPro děti i dospívající.",
  location: "Lipno nad Vltavou",
  contactEmail: "info@alpine.example",
  contactPhone: "+420 000 000 000",
  terms: [
    { id: "t1", name: "1. týden", startsOn: "2027-07-12", endsOn: "2027-07-18", priceCzk: 4900 },
    { id: "t2", name: "2. týden", startsOn: "2027-07-19", endsOn: "2027-07-25", priceCzk: 5600 },
  ],
  hasPhoto: true,
}

async function renderPage(detail: CatalogEventDetail) {
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventPage event={detail} />,
  })
  const apply = createRoute({
    getParentRoute: () => root,
    path: "/apply/$token",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page, apply]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole("heading", { level: 1 })
}

describe("EventPage", () => {
  it("shows the event, its terms with prices and the organization contact", async () => {
    await renderPage(event)

    expect(screen.getByRole("heading", { level: 1, name: "Letní kemp Lipno 2027" })).toBeVisible()
    expect(screen.getByText("Týden v přírodě.")).toBeInTheDocument()
    expect(screen.getByText("Pro děti i dospívající.")).toBeInTheDocument()
    expect(screen.getByText("12–18 Jul 2027")).toBeInTheDocument()
    expect(screen.getByText(/CZK 5,600/)).toBeInTheDocument()
    expect(screen.getByText("Lipno nad Vltavou")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Terms and prices" })).toBeVisible()
    expect(screen.getByRole("heading", { name: "Organization contact" })).toBeVisible()
    expect(screen.getByRole("link", { name: "info@alpine.example" })).toHaveAttribute(
      "href",
      "mailto:info@alpine.example",
    )
    expect(screen.getByRole("link", { name: "+420 000 000 000" })).toHaveAttribute(
      "href",
      "tel:+420000000000",
    )
  })

  it("shows the photo", async () => {
    await renderPage(event)

    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("/public/events/tok123/photo"),
    )
  })

  it("shows no photo for an event without one", async () => {
    await renderPage({ ...event, hasPhoto: false })

    expect(document.querySelector("img")).toBeNull()
  })

  it("leads to the application form", async () => {
    await renderPage(event)

    expect(screen.getByRole("link", { name: "Submit application" })).toHaveAttribute(
      "href",
      "/apply/tok123",
    )
  })

  it("shows no capacity, occupancy or free beds", async () => {
    await renderPage(event)

    expect(screen.queryByText(/capacity|free bed|occupied|waitlist/i)).not.toBeInTheDocument()
  })

  it("shows a term without a name by its dates only", async () => {
    await renderPage({
      ...event,
      terms: [{ id: "t1", name: null, startsOn: "2027-07-12", endsOn: "2027-07-18", priceCzk: 0 }],
    })

    expect(screen.getAllByText("12–18 Jul 2027").length).toBeGreaterThan(0)
    expect(screen.getByText(/Free/)).toBeInTheDocument()
  })

  it("leaves out what the organizer did not fill in", async () => {
    await renderPage({
      ...event,
      description: null,
      location: null,
      contactEmail: null,
      contactPhone: null,
    })

    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Organization contact" })).not.toBeInTheDocument()
    expect(screen.getByText("Alpine Collective")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "About the event" })).not.toBeInTheDocument()
  })
})
