import { QueryClient } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"
import { Route } from "@/routes/index"

import type { Session } from "@/features/auth/api/authSessionQueryOptions"

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))

const LANDING = /Registrations for events with multiple terms/

const sessionOf = (accountType: "ORGANIZER" | "PARTICIPANT"): Session => ({
  user: {
    id: "u1",
    email: "u@example.com",
    name: "U",
    accountType,
    mustSetPassword: false,
    locale: "en",
  },
})

function setup() {
  const queryClient = new QueryClient()
  const root = createRootRouteWithContext<{ queryClient: QueryClient }>()()
  const landing = createRoute({
    getParentRoute: () => root,
    path: "/",
    beforeLoad: Route.options.beforeLoad,
    component: Route.options.component,
  })
  const organizer = createRoute({
    getParentRoute: () => root,
    path: "/organizer",
    component: () => <p>Organizer home</p>,
  })
  const participant = createRoute({
    getParentRoute: () => root,
    path: "/participant",
    component: () => <p>Participant home</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([landing, organizer, participant]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient },
  })
  render(<RouterProvider router={router} />)
  return { router, queryClient }
}

afterEach(() => cleanup())

describe("landing (/)", () => {
  it("shows the landing to a signed-out visitor", async () => {
    const { queryClient } = setup()
    expect(await screen.findByText(LANDING)).toBeInTheDocument()
    expect(queryClient.getQueryData(authKeys.session())).toBeNull()
  })

  it("shows the landing when the session request fails", async () => {
    // No session is cached and the real request has nowhere to go.
    setup()
    expect(await screen.findByText(LANDING)).toBeInTheDocument()
  })

  it.each([
    ["ORGANIZER", "Organizer home", "/organizer"],
    ["PARTICIPANT", "Participant home", "/participant"],
  ] as const)(
    "sends a signed-in %s home without rendering the cached landing again",
    async (accountType, home, path) => {
      const { router, queryClient } = setup()
      // The visitor opened the landing signed out, so the router has it cached.
      await screen.findByText(LANDING)
      await act(() => router.navigate({ to: path }))
      queryClient.setQueryData(authKeys.session(), sessionOf(accountType))

      let hasRenderedLanding = false
      const observer = new MutationObserver(() => {
        if (screen.queryByText(LANDING)) hasRenderedLanding = true
      })
      observer.observe(document.body, { childList: true, subtree: true })
      await act(() => router.navigate({ to: "/" }))
      expect(await screen.findByText(home)).toBeInTheDocument()
      observer.disconnect()

      expect(hasRenderedLanding).toBe(false)
      expect(router.state.location.pathname).toBe(path)
    },
  )
})
