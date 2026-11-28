import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import "@/i18n"

import { AreaErrorPage } from "@/components/pages/AreaErrorPage"
import { ForbiddenError } from "@/lib/errors"

const renderWith = (error: unknown) => {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => <AreaErrorPage error={error} /> }),
    history: createMemoryHistory({ initialEntries: ["/participant"] }),
  })
  render(<RouterProvider router={router} />)
}

describe("AreaErrorPage", () => {
  it("leads an organizer who opened the participant area to their events (403)", async () => {
    renderWith(new ForbiddenError())

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You don't have access to this content",
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to events" })).toHaveAttribute(
      "href",
      "/organizer/events",
    )
  })

  it("shows the error page for anything else", async () => {
    renderWith(new Error("boom"))

    expect(await screen.findByRole("button", { name: /reload/i })).toBeInTheDocument()
  })
})
