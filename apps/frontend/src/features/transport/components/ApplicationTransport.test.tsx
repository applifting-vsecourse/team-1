import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
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
      options: [
        {
          id: "t1",
          kind: "SCHEDULED",
          instructions: null,
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

  it("drops a transport deleted meanwhile from the choices and still saves the others", async () => {
    const twoTerms = {
      ...offer,
      terms: [
        offer.terms[0]!,
        {
          ...offer.terms[0]!,
          termId: "term2",
          termName: "Druhý týden",
          options: [{ ...offer.terms[0]!.options[0]!, id: "t2", name: "Vlak z Brna" }],
        },
      ],
    }
    let current: typeof twoTerms = twoTerms
    const puts: string[] = []
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init)
      if (request.method !== "PUT") {
        return new Response(JSON.stringify(current), {
          headers: { "Content-Type": "application/json" },
        })
      }
      const body = (await request.json()) as { termId: string; transportId: string }
      puts.push(`${body.termId}:${body.transportId}`)
      if (body.transportId === "t1") {
        // The organizer deleted the only option of the first term.
        current = {
          ...twoTerms,
          terms: [{ ...twoTerms.terms[0]!, options: [] }, twoTerms.terms[1]!],
        }
        return new Response(JSON.stringify({ statusCode: 409, code: "TRANSPORT_UNAVAILABLE" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response(null, { status: 204 })
    })
    const root = createRootRoute()
    const router = createRouter({
      routeTree: root.addChildren([
        createRoute({
          getParentRoute: () => root,
          path: "/",
          component: () => <ApplicationTransport applicationId="a1" />,
        }),
        createRoute({
          getParentRoute: () => root,
          path: "/participant/applications/$applicationId",
          component: () => <p>Application detail</p>,
        }),
      ]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    const [first, second] = await screen.findAllByRole("combobox")
    await user.click(first!)
    await user.click(await screen.findByRole("option", { name: "Autobus z Prahy" }))
    await user.click(second!)
    await user.click(await screen.findByRole("option", { name: "Vlak z Brna" }))
    await user.click(screen.getByRole("button", { name: "Save transport" }))
    await waitFor(() => {
      expect(screen.getAllByRole("combobox")).toHaveLength(1)
    })

    await user.click(screen.getByRole("button", { name: "Save transport" }))
    expect(await screen.findByText("Application detail")).toBeInTheDocument()
    expect(puts.filter((put) => put === "term1:t1")).toHaveLength(1)
  })
})
