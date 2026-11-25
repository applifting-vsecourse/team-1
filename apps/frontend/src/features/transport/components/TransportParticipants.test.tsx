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
import { afterEach, expect, it, vi } from "vitest"

import { PAGE_SIZE } from "@/hooks/usePagination"

import { TransportParticipants } from "@/features/transport/components/TransportParticipants"

const participants = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => ({
  applicationId: `a${index}`,
  name: index === PAGE_SIZE ? "Eva Last" : `Jana ${index}`,
  email: `participant${index}@example.com`,
  phone: index === 0 ? "+420 777 000 001" : null,
}))

function renderParticipants() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        termId: "term1",
        termName: "Summer week",
        startsOn: "2027-07-12",
        endsOn: "2027-07-18",
        name: "Bus",
        kind: "SCHEDULED",
        participants,
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  )
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <TransportParticipants
        eventId="e1"
        transportId="bus"
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
}

afterEach(() => vi.restoreAllMocks())

it("expands contacts across the filtered pages and keeps individual disclosure available", async () => {
  renderParticipants()
  const user = userEvent.setup()
  const firstContact = participants[0]!
  const lastContact = participants.at(-1)!
  const expandAll = await screen.findByRole("button", { name: "Expand all contacts" })
  expect(screen.queryByText(firstContact.email)).not.toBeInTheDocument()
  await user.click(expandAll)
  expect(screen.getByText(firstContact.email)).toBeVisible()
  expect(screen.getByText(firstContact.phone!)).toBeVisible()
  expect(screen.getByText(participants[1]!.email)).toBeVisible()

  await user.click(screen.getByRole("button", { name: "Page 2" }))
  expect(screen.getByText(lastContact.email)).toBeVisible()
  await user.click(screen.getByRole("button", { name: /^Eva Last/ }))
  expect(screen.queryByText(lastContact.email)).not.toBeInTheDocument()

  await user.type(screen.getByRole("searchbox"), "Jana")
  await user.click(screen.getByRole("button", { name: "Collapse all contacts" }))
  expect(screen.queryByText(firstContact.email)).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Expand all contacts" }))
  expect(screen.getByText(firstContact.email)).toBeVisible()

  await user.clear(screen.getByRole("searchbox"))
  await user.click(screen.getByRole("button", { name: "Page 2" }))
  expect(screen.queryByText(lastContact.email)).not.toBeInTheDocument()
})
