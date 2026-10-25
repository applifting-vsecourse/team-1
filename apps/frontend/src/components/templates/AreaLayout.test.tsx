import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Calendar } from "lucide-react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarLink } from "@/components/atoms/SidebarLink"
import { AreaLayout } from "@/components/templates/AreaLayout"

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }))

function renderLayout() {
  const root = createRootRoute({
    component: () => (
      <AreaLayout
        roleLabel="Organizer"
        width="wide"
        account={<button type="button">Eva Malá</button>}
        nav={
          <SidebarLink
            to="/"
            icon={Calendar}
          >
            Events
          </SidebarLink>
        }
      >
        <h1>Event overview</h1>
      </AreaLayout>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([createRoute({ getParentRoute: () => root, path: "/" })]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("AreaLayout sidebar", () => {
  it("collapses, keeps accessible navigation and remembers the choice after remounting", async () => {
    const user = userEvent.setup()
    const view = renderLayout()
    const sidebar = await screen.findByRole("complementary", { name: "Main navigation" })
    const toggle = within(sidebar).getByRole("button", { name: "Collapse menu" })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    await user.click(toggle)
    expect(sidebar).toHaveAttribute("data-collapsed", "true")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveAccessibleName("Expand menu")
    expect(toggle).toHaveFocus()
    expect(within(sidebar).getByRole("link", { name: "Events" })).toHaveAttribute("title", "Events")
    expect(within(sidebar).getByRole("link", { name: "togena" })).toBeInTheDocument()
    expect(localStorage.getItem("togena.sidebar.collapsed")).toBe("true")
    view.unmount()
    renderLayout()
    const restored = await screen.findByRole("button", { name: "Expand menu" })
    await user.click(restored)
    expect(restored).toHaveAttribute("aria-expanded", "true")
    expect(localStorage.getItem("togena.sidebar.collapsed")).toBe("false")
  })

  it("keeps the mobile drawer expanded when the desktop menu is collapsed", async () => {
    localStorage.setItem("togena.sidebar.collapsed", "true")
    const user = userEvent.setup()
    renderLayout()
    await user.click(await screen.findByRole("button", { name: "Open navigation" }))
    const drawer = screen.getByRole("dialog", { name: "Organizer" })
    expect(within(drawer).getByRole("link", { name: "Events" })).toBeInTheDocument()
    expect(within(drawer).queryByRole("button", { name: "Expand menu" })).not.toBeInTheDocument()
    expect(drawer.querySelector("[data-collapsed]")).toBeNull()
  })

  it("can collapse the menu when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked")
    })
    const user = userEvent.setup()
    renderLayout()
    await user.click(await screen.findByRole("button", { name: "Collapse menu" }))
    expect(screen.getByRole("button", { name: "Expand menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("puts the account at the bottom of the sidebar, not in the top bar", async () => {
    renderLayout()

    const sidebar = await screen.findByRole("complementary", { name: "Main navigation" })
    expect(within(sidebar).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Eva Malá" })).toHaveLength(1)
  })

  it("keeps language and theme in the top bar and out of the drawer", async () => {
    const user = userEvent.setup()
    renderLayout()

    expect(await screen.findByRole("button", { name: "Change language" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open navigation" }))
    const drawer = await screen.findByRole("dialog")
    expect(within(drawer).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    expect(within(drawer).queryByText("Language")).not.toBeInTheDocument()
    expect(within(drawer).queryByText("Appearance")).not.toBeInTheDocument()
  })
})
