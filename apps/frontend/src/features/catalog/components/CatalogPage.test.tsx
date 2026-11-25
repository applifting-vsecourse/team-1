import { useState } from "react"
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
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CatalogPage } from "@/features/catalog/components/CatalogPage"

const event = (overrides: object) => ({
  publicToken: "tok",
  name: "Letní kemp Lipno 2027",
  organizationId: "o1",
  organizationName: "Alpine Collective",
  location: "Lipno nad Vltavou",
  terms: [
    { name: "První turnus", startsOn: "2027-07-12", endsOn: "2027-07-18" },
    { name: null, startsOn: "2027-07-20", endsOn: "2027-07-25" },
  ],
  termCount: 2,
  fromPriceCzk: 4900,
  isOpenForApplications: true,
  hasPhoto: true,
  ...overrides,
})

const catalog = {
  organizations: [
    { id: "o1", name: "Alpine Collective" },
    { id: "o2", name: "Summit Events" },
  ],
  events: [
    event({}),
    event({
      publicToken: "tok2",
      name: "Víkend na Šumavě",
      terms: [{ name: null, startsOn: "2027-07-12", endsOn: "2027-07-18" }],
      termCount: 1,
      fromPriceCzk: 2900,
      location: null,
    }),
    event({
      publicToken: "tok3",
      name: "Podzimní konference 2027",
      organizationId: "o2",
      organizationName: "Summit Events",
      isOpenForApplications: false,
      hasPhoto: false,
    }),
  ],
}

function Harness() {
  const [organizationId, setOrganizationId] = useState<string | undefined>()
  return (
    <CatalogPage
      organizationId={organizationId}
      onOrganizationChange={setOrganizationId}
    />
  )
}

function renderPage(respond: () => Promise<Response>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(respond)
  const root = createRootRoute()
  const page = createRoute({ getParentRoute: () => root, path: "/", component: Harness })
  const catalogEvent = createRoute({
    getParentRoute: () => root,
    path: "/catalog/$publicToken",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page, catalogEvent]),
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

const json = (body: object) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }),
  )

// jsdom lacks what the Radix select uses to open its list.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

afterEach(() => vi.restoreAllMocks())

describe("CatalogPage", () => {
  it("has one heading and no way back to the landing page", async () => {
    renderPage(() => json(catalog))

    expect(await screen.findByRole("heading", { level: 1, name: "Event catalog" })).toBeVisible()
    expect(screen.queryByRole("link", { name: "Back to home" })).not.toBeInTheDocument()
  })

  it("lists the events as cards with the summary of the terms, the place and the price", async () => {
    renderPage(() => json(catalog))

    const card = (await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })).closest(
      "a",
    )
    expect(screen.getByRole("link", { name: "Alpine Collective" })).toHaveAttribute(
      "href",
      expect.stringContaining("organization=o1"),
    )
    expect(screen.getByText("2 events")).toBeInTheDocument()
    expect(card).toHaveAttribute("href", "/events/tok")
    expect(card).toHaveTextContent("Applications open")
    expect(card).toHaveTextContent("2 terms · July 2027")
    expect(card).toHaveTextContent("Lipno nad Vltavou")
    expect(card).toHaveTextContent("from CZK 4,900 / participant")
  })

  it("shows the dates and the exact price of an event with one term", async () => {
    renderPage(() => json(catalog))

    const card = (await screen.findByRole("heading", { name: "Víkend na Šumavě" })).closest("a")
    expect(card).toHaveTextContent("12–18 Jul 2027")
    expect(card).toHaveTextContent("CZK 2,900 / participant")
    expect(card).not.toHaveTextContent("from")
    expect(card).not.toHaveTextContent("terms")
  })

  it("names the months an event spans when its terms are in more than one", async () => {
    renderPage(() =>
      json({
        organizations: catalog.organizations,
        events: [
          event({
            terms: [
              { name: null, startsOn: "2027-07-28", endsOn: "2027-08-03" },
              { name: null, startsOn: "2027-08-10", endsOn: "2027-08-16" },
            ],
          }),
        ],
      }),
    )

    expect(await screen.findByText("2 terms · July–August 2027")).toBeInTheDocument()
  })

  it("shows the status on the card and no published badge", async () => {
    renderPage(() => json(catalog))

    expect(await screen.findByText("Applications are not open")).toBeInTheDocument()
    expect(screen.queryByText("Published")).not.toBeInTheDocument()
  })

  it("shows the photo of an event that has one, a placeholder for one that has none", async () => {
    renderPage(() => json(catalog))

    const card = (await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })).closest(
      "a",
    )
    expect(card?.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("/public/events/tok/photo"),
    )
    const withoutPhoto = screen
      .getByRole("heading", { name: "Podzimní konference 2027" })
      .closest("a")
    expect(withoutPhoto?.querySelector("img")).toBeNull()
    expect(withoutPhoto?.querySelector("svg")).not.toBeNull()
  })

  it("shows the events of the chosen organization with a way back to the catalog", async () => {
    renderPage(() => json(catalog))
    await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })

    await userEvent.click(screen.getByRole("combobox", { name: "Organization" }))
    await userEvent.click(await screen.findByRole("option", { name: "Summit Events" }))

    expect(screen.getByRole("heading", { level: 1, name: "Summit Events" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Back to catalog" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Podzimní konference 2027" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Letní kemp Lipno 2027" })).not.toBeInTheDocument()
  })

  it("says there are no published events yet", async () => {
    renderPage(() => json({ organizations: [], events: [] }))

    expect(await screen.findByRole("heading", { name: "No published events yet" })).toBeVisible()
    expect(screen.getByText(/you will find them in the catalog/)).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("shows card skeletons announced to screen readers until the catalog arrives", async () => {
    renderPage(() => new Promise(() => undefined))

    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent("Loading events…")
    expect(status).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("heading", { level: 1, name: "Event catalog" })).toBeInTheDocument()
  })

  it("shows the error with one retry action and loads again on it", async () => {
    let attempt = 0
    renderPage(() => {
      attempt += 1
      return attempt === 1 ? Promise.resolve(new Response("{}", { status: 500 })) : json(catalog)
    })

    expect(await screen.findByText("The catalog couldn't be loaded")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(
      await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" }),
    ).toBeInTheDocument()
  })
})
