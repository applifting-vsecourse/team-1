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

import { TransportList } from "@/features/transport/components/TransportList"

const bus = {
  id: "t1",
  kind: "SCHEDULED",
  name: "Autobus z Prahy",
  departurePlace: "Praha, Černý Most",
  departureAt: "2027-07-12T06:00:00.000Z",
  instructions: null,
  participantsCount: 24,
}
const own = {
  id: "own1",
  kind: "OWN",
  name: "",
  departurePlace: null,
  departureAt: null,
  instructions: "Parkoviště za bránou",
  participantsCount: 2,
}

const listing = {
  eventName: "Letní kemp",
  terms: [
    {
      termId: "term1",
      termName: "Letní týden",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      transports: [bus, own],
    },
    {
      termId: "term2",
      termName: null,
      startsOn: "2027-07-19",
      endsOn: "2027-07-25",
      transports: [bus],
    },
  ],
}

function renderList() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(listing), { headers: { "Content-Type": "application/json" } }),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <TransportList eventId="e1" />,
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
}

afterEach(() => vi.restoreAllMocks())

describe("TransportList", () => {
  it("lists the transport of a term, own transport only where it was added", async () => {
    renderList()

    expect((await screen.findAllByText("Autobus z Prahy")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Praha, Černý Most").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Own transport").length).toBeGreaterThan(0)
    // The term already has own transport, so it is not offered a second one.
    expect(screen.queryByRole("button", { name: "Add own transport" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add transport" })).toBeInTheDocument()
  })

  it("asks for an acknowledgement before deleting a transport that participants chose", async () => {
    renderList()
    const user = userEvent.setup()

    const [deleteButton] = await screen.findAllByRole("button", {
      name: "Delete transport Autobus z Prahy",
    })
    await user.click(deleteButton!)

    expect(await screen.findByText(/24 participants chose this transport/)).toBeInTheDocument()
    const confirm = screen.getByRole("button", { name: "Delete transport" })
    expect(confirm).toBeDisabled()
    await user.click(screen.getByRole("checkbox"))
    expect(confirm).toBeEnabled()
  })
})
