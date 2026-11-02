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
  it("lists the published events as cards that open the event page", async () => {
    renderPage(() => json(catalog))

    const card = (await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })).closest(
      "a",
    )
    expect(card).toHaveAttribute("href", "/catalog/tok")
    expect(card).toHaveTextContent("Alpine Collective")
    expect(card).toHaveTextContent("Lipno nad Vltavou")
    expect(card).toHaveTextContent("Applications open")
    expect(card).toHaveTextContent("12–18 Jul 2027")
    expect(card).toHaveTextContent("První turnus")
    expect(card).toHaveTextContent("20–25 Jul 2027")
    expect(card).toHaveTextContent("2 terms · from")
    expect(
      screen.getByRole("heading", { name: "Víkend na Šumavě" }).closest("a"),
    ).toHaveTextContent("1 term · CZK 2,900")
    expect(screen.getByText("Published")).toBeInTheDocument()
  })

  it("shows the events of the chosen organization only", async () => {
    renderPage(() => json(catalog))
    await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" })

    await userEvent.click(screen.getByRole("combobox", { name: "Organization" }))
    await userEvent.click(await screen.findByRole("option", { name: "Summit Events" }))

    expect(screen.getByRole("heading", { name: "Podzimní konference 2027" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Letní kemp Lipno 2027" })).not.toBeInTheDocument()
  })

  it("says there are no published events yet", async () => {
    renderPage(() => json({ organizations: [], events: [] }))

    expect(await screen.findByText("No published events yet")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("shows the loading state until the catalog arrives", async () => {
    renderPage(() => new Promise(() => undefined))

    expect(await screen.findByRole("status")).toHaveTextContent("Loading…")
    expect(screen.getByRole("heading", { name: "Event catalog" })).toBeInTheDocument()
  })

  it("shows the error and loads again on retry", async () => {
    let attempt = 0
    renderPage(() => {
      attempt += 1
      return attempt === 1 ? Promise.resolve(new Response("{}", { status: 500 })) : json(catalog)
    })

    expect(await screen.findByText("The catalog couldn't be loaded.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(
      await screen.findByRole("heading", { name: "Letní kemp Lipno 2027" }),
    ).toBeInTheDocument()
  })
})
