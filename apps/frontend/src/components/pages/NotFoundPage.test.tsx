import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import "@/i18n"

import { NotFoundPage } from "@/components/pages/NotFoundPage"

describe("NotFoundPage", () => {
  it("says the page does not exist and links to the home page", async () => {
    const router = createRouter({
      routeTree: createRootRoute({ component: NotFoundPage }),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    })
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument()
    expect(
      screen.getByText("404 · The page doesn't exist or the link was mistyped."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to home page" })).toHaveAttribute("href", "/")
  })
})
