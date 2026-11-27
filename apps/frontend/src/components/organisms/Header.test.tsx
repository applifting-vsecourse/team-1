import type { ReactNode } from "react"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import "@/i18n"

import { Header } from "@/components/organisms/Header"

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))

const renderInRouter = (ui: ReactNode) => {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

describe("Header", () => {
  it("signed out: the catalog and organizers on the left, language, theme and Sign in on the right", async () => {
    renderInRouter(<Header />)

    const banner = await screen.findByRole("banner")
    const nav = within(banner).getByRole("navigation")
    expect(within(nav).getByRole("link", { name: "Event catalog" })).toHaveAttribute(
      "href",
      "/catalog",
    )
    expect(within(nav).getByRole("link", { name: "For organizers" })).toHaveAttribute(
      "href",
      "/#organizers",
    )
    expect(within(banner).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/participant/login",
    )
    expect(within(banner).queryByRole("link", { name: "My applications" })).not.toBeInTheDocument()
  })

  it("on the sign-in and system pages leaves Sign in out", async () => {
    renderInRouter(<Header hasSignIn={false} />)

    const banner = await screen.findByRole("banner")
    expect(within(banner).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument()
    expect(within(banner).getByRole("link", { name: "Event catalog" })).toBeInTheDocument()
  })

  it("puts another action in the place of Sign in", async () => {
    renderInRouter(<Header action={<button type="button">Sign out</button>} />)

    const banner = await screen.findByRole("banner")
    expect(within(banner).getByRole("button", { name: "Sign out" })).toBeInTheDocument()
    expect(within(banner).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument()
  })
})
