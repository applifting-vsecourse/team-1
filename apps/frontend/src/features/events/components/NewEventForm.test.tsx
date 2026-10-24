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

import { NewEventPage } from "@/features/events/components/NewEventForm"

function renderPage() {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ organizations: [{ id: "o1", name: "Kemp Lipno" }] }), {
        headers: { "Content-Type": "application/json" },
      }),
    ),
  )
  const root = createRootRoute()
  const page = createRoute({ getParentRoute: () => root, path: "/", component: NewEventPage })
  const events = createRoute({ getParentRoute: () => root, path: "/organizer/events" })
  const router = createRouter({
    routeTree: root.addChildren([page, events]),
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

describe("NewEventPage", () => {
  it("asks for the name and sends nothing until it is filled in", async () => {
    const fetchMock = renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Create event" }))

    expect(await screen.findByText("Enter the event name.")).toBeInTheDocument()
    expect(screen.getByLabelText("Event name *")).toHaveAttribute("aria-invalid", "true")
    const posts = fetchMock.mock.calls.filter(([request]) => (request as Request).method === "POST")
    expect(posts).toHaveLength(0)
  })
})
