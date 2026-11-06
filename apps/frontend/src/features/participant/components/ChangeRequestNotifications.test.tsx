import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ChangeRequestNotifications } from "@/features/participant/components/ChangeRequestNotifications"

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get, patch } }))

beforeEach(() => {
  get.mockReset()
  patch.mockReset()
  get.mockImplementation(() => ({
    json: () =>
      Promise.resolve([
        {
          id: "r1",
          applicationId: "a1",
          eventName: "Summer camp",
          status: "APPROVED",
          createdAt: "2027-07-03T12:00:00Z",
          reviewedAt: "2027-07-04T12:00:00Z",
          readAt: null,
        },
      ]),
  }))
})

describe("ChangeRequestNotifications", () => {
  it("shows an unread approval and opens its application", async () => {
    patch.mockResolvedValue(undefined)
    const root = createRootRoute({ component: () => <ChangeRequestNotifications /> })
    const application = createRoute({
      getParentRoute: () => root,
      path: "/participant/applications/$applicationId",
    })
    const router = createRouter({
      routeTree: root.addChildren([application]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }))
    const link = within(screen.getByRole("dialog")).getByRole("link", { name: /Summer camp/ })
    expect(link).toHaveAttribute("href", "/participant/applications/a1")
    await user.click(link)
    expect(patch).toHaveBeenCalledWith("participant/change-request-notifications/r1/read")
  })
})
