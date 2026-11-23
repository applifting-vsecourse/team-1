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
      screen.getByText(
        "The link may be incorrect or no longer valid. You can continue from the homepage.",
      ),
    ).toBeInTheDocument()
    const back = screen.getByRole("link", { name: "Go to homepage" })
    expect(back).toHaveAttribute("href", "/")
    expect(back).toHaveClass("rounded-full", "size-11")
  })
})
