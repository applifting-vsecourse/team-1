import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LinkNotFoundPage } from "@/components/pages/LinkNotFoundPage"

describe("LinkNotFoundPage", () => {
  it("says the link doesn't work and leads to the catalog, with no event-specific wording", async () => {
    const root = createRootRoute({ component: LinkNotFoundPage })
    const catalog = createRoute({ getParentRoute: () => root, path: "/catalog" })
    const router = createRouter({
      routeTree: root.addChildren([catalog]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    })
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole("heading", { level: 1, name: "This link doesn't work" }),
    ).toBeVisible()
    expect(screen.getByRole("link", { name: "Browse events" })).toHaveAttribute("href", "/catalog")
    expect(screen.queryByText(/event page|not ready/i)).not.toBeInTheDocument()
    // #738: a closed event looks the same as a missing one, with no description (PO, 26. 11.).
    expect(screen.queryByText(/doesn't exist|accepting applications/i)).not.toBeInTheDocument()
    expect(screen.getByText("Managing multi-term events")).toBeInTheDocument()
  })
})
