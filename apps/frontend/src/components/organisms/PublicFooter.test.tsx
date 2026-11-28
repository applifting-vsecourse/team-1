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

import { PublicFooter } from "@/components/organisms/PublicFooter"

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))

const renderInRouter = (ui: ReactNode) => {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

describe("PublicFooter", () => {
  it("starts with language and theme (the phone header has no room for them)", async () => {
    renderInRouter(<PublicFooter />)

    const preferences = await screen.findByRole("group", { name: "Language and appearance" })
    expect(within(preferences).getByText("Language")).toBeInTheDocument()
    expect(within(preferences).getByRole("radiogroup", { name: "Appearance" })).toBeInTheDocument()
  })

  it("leads participants to the catalog and the sign-in, organizers to registration and their sign-in", async () => {
    renderInRouter(<PublicFooter />)

    const participants = await screen.findByRole("navigation", { name: "For participants" })
    expect(within(participants).getByRole("link", { name: "Event catalog" })).toHaveAttribute(
      "href",
      "/catalog",
    )
    expect(within(participants).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/participant/login",
    )
    const organizers = screen.getByRole("navigation", { name: "For organizers" })
    expect(within(organizers).getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/organizer/register",
    )
    expect(within(organizers).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/organizer/login",
    )
  })

  it("minimal: only the preferences and the signature, no links", async () => {
    renderInRouter(<PublicFooter isMinimal />)

    expect(
      await screen.findByRole("group", { name: "Language and appearance" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Togena · Managing multi-term events")).toBeInTheDocument()
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
  })
})
