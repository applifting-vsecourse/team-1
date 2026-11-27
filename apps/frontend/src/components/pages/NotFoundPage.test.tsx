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

const renderAt = (path: string) => {
  const router = createRouter({
    routeTree: createRootRoute({ component: NotFoundPage }),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(<RouterProvider router={router} />)
}

describe("NotFoundPage", () => {
  it("on a public page says the link doesn't work and leads to the catalog, with no code", async () => {
    renderAt("/events/unknown")

    expect(
      await screen.findByRole("heading", { level: 1, name: "This link doesn't work" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Browse events" })).toHaveAttribute("href", "/catalog")
    expect(screen.queryByText("404")).not.toBeInTheDocument()
    // The public header without „Sign in“: this is not where it would lead.
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument()
  })

  it("in the organizer area leads to the events", async () => {
    renderAt("/organizer/unknown")

    expect(await screen.findByRole("link", { name: "Go to events" })).toHaveAttribute(
      "href",
      "/organizer/events",
    )
  })

  it("in the participant area leads to the applications", async () => {
    renderAt("/participant/unknown")

    expect(await screen.findByRole("link", { name: "My applications" })).toHaveAttribute(
      "href",
      "/participant",
    )
  })
})
