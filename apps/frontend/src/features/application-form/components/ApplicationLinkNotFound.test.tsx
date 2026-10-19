import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ApplicationLinkNotFound } from "@/features/application-form/components/ApplicationLinkNotFound"

describe("ApplicationLinkNotFound", () => {
  it("says the link doesn't work and leads back to the home page", async () => {
    const root = createRootRoute({ component: ApplicationLinkNotFound })
    const home = createRoute({ getParentRoute: () => root, path: "/" })
    const router = createRouter({
      routeTree: root.addChildren([home]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    })
    render(<RouterProvider router={router} />)

    expect(await screen.findByText("404")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 1, name: "The application link doesn't work" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to Togena" })).toHaveAttribute("href", "/")
  })
})
