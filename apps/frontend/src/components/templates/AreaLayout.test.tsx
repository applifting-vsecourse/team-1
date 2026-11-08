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
    const toggle = within(sidebar).getByRole("button", { name: "Collapse panel" })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    await user.click(toggle)
    expect(sidebar).toHaveAttribute("data-collapsed", "true")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveAccessibleName("Expand panel")
    expect(toggle).toHaveFocus()
    expect(within(sidebar).getByRole("link", { name: "Events" })).toHaveAttribute("title", "Events")
    expect(within(sidebar).getByRole("link", { name: "togena" })).toBeInTheDocument()
    expect(localStorage.getItem("togena.sidebar.collapsed")).toBe("true")
    view.unmount()
    renderLayout()
    const restored = await screen.findByRole("button", { name: "Expand panel" })
    await user.click(restored)
    expect(restored).toHaveAttribute("aria-expanded", "true")
    expect(localStorage.getItem("togena.sidebar.collapsed")).toBe("false")
  })

  it("toggles with Ctrl+B and Cmd+B, but not while typing in a field", async () => {
    const user = userEvent.setup()
    renderLayout()
    const sidebar = await screen.findByRole("complementary", { name: "Main navigation" })
    await user.keyboard("{Control>}b{/Control}")
    expect(sidebar).toHaveAttribute("data-collapsed", "true")
    await user.keyboard("{Meta>}b{/Meta}")
    expect(sidebar).toHaveAttribute("data-collapsed", "false")
    const field = document.createElement("input")
    document.body.appendChild(field)
    field.focus()
    await user.keyboard("{Control>}b{/Control}")
    expect(sidebar).toHaveAttribute("data-collapsed", "false")
    field.remove()
  })

  it("has a single icon-only control, no text button at the bottom, and a tooltip with the shortcut", async () => {
    const user = userEvent.setup()
    renderLayout()
    const sidebar = await screen.findByRole("complementary", { name: "Main navigation" })
    expect(within(sidebar).getAllByRole("button", { name: /panel/ })).toHaveLength(1)
    expect(within(sidebar).queryByText("Collapse panel")).not.toBeInTheDocument()
    await user.hover(within(sidebar).getByRole("button", { name: "Collapse panel" }))
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Collapse panel")
    expect(screen.getByRole("tooltip")).toHaveTextContent("Ctrl B")
  })

  it("keeps the mobile drawer expanded when the desktop menu is collapsed", async () => {
    localStorage.setItem("togena.sidebar.collapsed", "true")
    const user = userEvent.setup()
    renderLayout()
    await user.click(await screen.findByRole("button", { name: "Open navigation" }))
    const drawer = screen.getByRole("dialog", { name: "Organizer" })
    expect(within(drawer).getByRole("link", { name: "Events" })).toBeInTheDocument()
    expect(within(drawer).queryByRole("button", { name: "Expand panel" })).not.toBeInTheDocument()
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
    await user.click(await screen.findByRole("button", { name: "Collapse panel" }))
    expect(screen.getByRole("button", { name: "Expand panel" })).toHaveAttribute(
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

  it("keeps language and theme out of the top bar and the drawer", async () => {
    const user = userEvent.setup()
    renderLayout()

    expect(
      await screen.findByRole("complementary", { name: "Main navigation" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Change language" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Toggle theme" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open navigation" }))
    const drawer = await screen.findByRole("dialog")
    expect(within(drawer).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    expect(within(drawer).queryByText("Language")).not.toBeInTheDocument()
    expect(within(drawer).queryByText("Appearance")).not.toBeInTheDocument()
  })
})
