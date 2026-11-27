import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { Calendar, Grid2x2 } from "lucide-react"
import { describe, expect, it } from "vitest"

import { SidebarLink } from "@/components/atoms/SidebarLink"

async function renderSidebar() {
  const root = createRootRoute({
    component: () => (
      <nav>
        <SidebarLink
          to="/events"
          icon={Calendar}
        >
          Events
        </SidebarLink>
        <SidebarLink
          to="/catalog"
          icon={Grid2x2}
        >
          Catalog
        </SidebarLink>
      </nav>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: "/events" }),
      createRoute({ getParentRoute: () => root, path: "/catalog" }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/events"] }),
  })
  render(<RouterProvider router={router} />)
  return {
    active: await screen.findByRole("link", { name: "Events" }),
    other: screen.getByRole("link", { name: "Catalog" }),
  }
}

// System B, nav option A (DESIGN.md, Layout): grey surface, Semi Bold ink, an orange bar; no corners.
describe("SidebarLink", () => {
  it("marks the active item with the neutral surface, Semi Bold text and the orange bar", async () => {
    const { active, other } = await renderSidebar()

    expect(active).toHaveAttribute("data-status", "active")
    expect(other).not.toHaveAttribute("data-status", "active")
    expect(active).toHaveClass("data-[status=active]:bg-nav-active")
    expect(active).toHaveClass("data-[status=active]:font-semibold")
    const bar = active.querySelector('[data-slot="nav-indicator"]')
    expect(bar).toHaveClass("bg-nav-indicator", "h-6", "w-1", "group-data-[status=active]:block")
    expect(bar).toHaveAttribute("aria-hidden", "true")
  })

  it("keeps hover neutral and weaker than the active surface, focus teal, and draws no corners", async () => {
    const { active } = await renderSidebar()

    expect(active).toHaveClass(
      "hover:bg-action-subtle",
      "focus-visible:outline-ring",
      "focus-visible:outline-offset-2",
    )
    expect(active.className).not.toMatch(/brand-warm|sidebar-accent|bg-accent/)
    // Only the item's own icon: the ActiveCorners arcs are gone from the sidebar.
    expect(active.querySelectorAll("svg")).toHaveLength(1)
  })
})
