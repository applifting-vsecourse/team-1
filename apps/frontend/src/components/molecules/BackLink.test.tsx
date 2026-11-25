import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { BackLink as OrganizerBackLink } from "@/components/atoms/BackLink"
import { BackLink as PublicBackLink } from "@/components/molecules/BackLink"

describe.each([OrganizerBackLink, PublicBackLink])("BackLink", (BackLink) => {
  it.each(["keyboard", "touch"])("keeps round back navigation accessible by %s", async (input) => {
    const root = createRootRoute()
    const source = createRoute({
      getParentRoute: () => root,
      path: "/source",
      component: () => <BackLink to="/">Back home</BackLink>,
    })
    const target = createRoute({
      getParentRoute: () => root,
      path: "/",
      component: () => <h1>Home</h1>,
    })
    const router = createRouter({
      routeTree: root.addChildren([source, target]),
      history: createMemoryHistory({ initialEntries: ["/source"] }),
    })
    render(<RouterProvider router={router} />)
    const user = userEvent.setup()
    const link = await screen.findByRole("link", { name: "Back home" })
    expect(link).toHaveAttribute("data-size", "icon-lg")
    expect(link).toHaveClass("rounded-full", "focus-visible:outline-2")
    if (input === "keyboard") {
      await user.tab()
      expect(link).toHaveFocus()
      expect(await screen.findByRole("tooltip")).toHaveTextContent("Back home")
      await user.keyboard("{Enter}")
    } else {
      await user.pointer([
        { keys: "[TouchA>]", target: link },
        { keys: "[/TouchA]", target: link },
      ])
    }
    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument()
  })
})
