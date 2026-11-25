import { QueryClient } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"
import { Route } from "@/routes/index"

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))

function renderLanding() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), null)
  const root = createRootRouteWithContext<{ queryClient: QueryClient }>()()
  const landing = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: Route.options.component,
  })
  const router = createRouter({
    routeTree: root.addChildren([landing]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { queryClient },
  })
  return render(<RouterProvider router={router} />)
}

const heroOf = async () => (await screen.findByRole("heading", { level: 1 })).closest("section")!

afterEach(() => cleanup())

describe("landing", () => {
  it("has the hero, the features and the closing section, and nothing else", async () => {
    renderLanding()

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Registrations for events with multiple terms without the chaos",
      }),
    ).toBeVisible()
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "What you can do in Togena",
      "Ready to list your first event?",
    ])
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Confirmation and waitlist",
      "Applications for several terms",
      "Capacity by rooms",
      "Payment overview",
    ])
    expect(screen.queryByText("For every kind of event")).not.toBeInTheDocument()
  })

  it("leads organizers to sign in and applicants to the catalog, in the hero and again at the end", async () => {
    renderLanding()
    const hero = await heroOf()

    expect(within(hero).getByRole("link", { name: "Create an event" })).toHaveAttribute(
      "href",
      "/organizer/login",
    )
    expect(within(hero).getByRole("link", { name: "Find an event" })).toHaveAttribute(
      "href",
      "/catalog",
    )
    expect(within(hero).getByText("You apply without creating an account.")).toBeVisible()
    expect(screen.getAllByRole("link", { name: "Create an event" })).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: "Find an event" })).toHaveLength(2)
    expect(screen.getAllByText("You apply without creating an account.")).toHaveLength(2)
  })

  it("keeps My applications in the header, not in the hero", async () => {
    renderLanding()
    const hero = await heroOf()

    expect(within(hero).queryByRole("link", { name: "My applications" })).not.toBeInTheDocument()
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "My applications" }),
    ).toHaveAttribute("href", "/participant/login")
  })
})
