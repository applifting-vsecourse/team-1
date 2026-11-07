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

import { ApplicationTransport } from "@/features/transport/components/ApplicationTransport"

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const offer = {
  participantName: "Jana Nováková",
  eventName: "Letní kemp",
  terms: [
    {
      termId: "term1",
      termName: "Letní týden",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      status: "CONFIRMED",
      selectedTransportId: null,
      isOwn: false,
      options: [
        {
          id: "t1",
          name: "Autobus z Prahy",
          departurePlace: "Praha, Černý Most",
          departureAt: "2027-07-12T06:00:00.000Z",
        },
      ],
    },
  ],
}

function renderPage() {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const method = input instanceof Request ? input.method : (init?.method ?? "GET")
    return Promise.resolve(
      method === "PUT"
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(offer), { headers: { "Content-Type": "application/json" } }),
    )
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <ApplicationTransport applicationId="a1" />,
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/participant/applications/$applicationId",
    component: () => <p>Application detail</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([page, detail]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return fetchMock
}

afterEach(() => vi.restoreAllMocks())

describe("ApplicationTransport", () => {
  it("returns to the application once the choice is saved", async () => {
    renderPage()
    await userEvent.click(await screen.findByRole("combobox", { name: "Transport" }))
    await userEvent.click(await screen.findByRole("option", { name: "Autobus z Prahy" }))
    await userEvent.click(screen.getByRole("button", { name: "Save transport" }))

    expect(await screen.findByText("Application detail")).toBeInTheDocument()
  })
})
