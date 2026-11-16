import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { EventNotFound } from "@/features/catalog/components/EventNotFound"

describe("EventNotFound", () => {
  it("says the event link is not available and leads to the home page", async () => {
    const root = createRootRoute()
    const page = createRoute({ getParentRoute: () => root, path: "/", component: EventNotFound })
    const router = createRouter({
      routeTree: root.addChildren([page]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/")
  })
})
