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

import { TransportForm } from "@/features/transport/components/TransportForm"

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

const listing = {
  eventName: "Letní kemp",
  eventLocation: null,
  terms: [
    {
      termId: "term1",
      termName: "Letní týden",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      ownCount: 0,
      transports: [
        {
          id: "t1",
          name: "Autobus z Prahy",
          departurePlace: "Praha, Černý Most",
          departureAt: "2027-07-12T06:00:00.000Z",
          participantsCount: 0,
        },
      ],
    },
  ],
}

function renderForm(props: { transportId?: string } = {}) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) =>
    Promise.resolve(
      new Response(
        (input instanceof Request ? input.url : String(input)).includes("/transport")
          ? JSON.stringify(listing)
          : "{}",
        {
          headers: { "Content-Type": "application/json" },
        },
      ),
    ),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <TransportForm
        eventId="e1"
        termId="term1"
        {...props}
      />
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
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

describe("TransportForm", () => {
  it("requires every field", async () => {
    renderForm()
    await userEvent.click(await screen.findByRole("button", { name: "Save transport" }))

    expect(await screen.findAllByText("Fill in this field.")).toHaveLength(2)
    expect(screen.getByText("Enter a valid date and time.")).toBeInTheDocument()
  })

  it("rejects a departure after the end of the term", async () => {
    renderForm()
    await userEvent.type(await screen.findByLabelText("Name *"), "Autobus")
    await userEvent.type(screen.getByLabelText("Departure place *"), "Praha")
    await userEvent.type(screen.getByLabelText("Departure date and time *"), "19/07/2027 08:00")
    await userEvent.click(screen.getByRole("button", { name: "Save transport" }))

    expect(await screen.findByText(/can't be after the term ends/)).toBeInTheDocument()
  })

  it("copies the name and the place of an existing transport but not the time", async () => {
    renderForm()
    await userEvent.click(
      await screen.findByRole("combobox", { name: "Copy from existing transport" }),
    )
    await userEvent.click(await screen.findByRole("option", { name: /Autobus z Prahy/ }))

    expect(screen.getByLabelText("Name *")).toHaveValue("Autobus z Prahy")
    expect(screen.getByLabelText("Departure place *")).toHaveValue("Praha, Černý Most")
    expect(screen.getByLabelText("Departure date and time *")).toHaveValue("")
  })

  it("does not offer copying when editing and locks the term", async () => {
    renderForm({ transportId: "t1" })

    expect(await screen.findByLabelText("Name *")).toHaveValue("Autobus z Prahy")
    expect(screen.queryByRole("combobox", { name: "Copy from existing transport" })).toBeNull()
    expect(screen.getByRole("combobox", { name: "Term" })).toBeDisabled()
  })
})
