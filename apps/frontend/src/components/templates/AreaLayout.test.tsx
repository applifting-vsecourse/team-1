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

describe("AreaLayout work layer", () => {
  it("marks the page as the work layer while it is shown, so hover doesn't move anything", async () => {
    const { unmount } = renderLayout()
    await screen.findByRole("heading", { name: "Event overview" })
    expect(document.body).toHaveAttribute("data-layer", "work")
    unmount()
    expect(document.body).not.toHaveAttribute("data-layer")
  })
})

describe("AreaLayout sidebar", () => {
  it("keeps desktop navigation visible with a legacy preference or shortcut", async () => {
    localStorage.setItem("togena.sidebar.collapsed", "true")
    const user = userEvent.setup()
    renderLayout()
    const sidebar = await screen.findByRole("complementary", { name: "Main navigation" })
    await user.keyboard("{Control>}b{/Control}{Meta>}b{/Meta}")
    expect(within(sidebar).getByRole("link", { name: "Events" })).toBeVisible()
    expect(within(sidebar).queryByRole("button", { name: /panel/i })).not.toBeInTheDocument()
    expect(sidebar).not.toHaveAttribute("data-collapsed")
  })

  it("puts the account at the bottom of the sidebar, not in the top bar", async () => {
    renderLayout()

    const sidebar = await screen.findByRole("complementary", { name: "Main navigation" })
    expect(within(sidebar).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Eva Malá" })).toHaveLength(1)
  })

  it("exposes navigation and the account in the mobile drawer", async () => {
    const user = userEvent.setup()
    renderLayout()

    expect(
      await screen.findByRole("complementary", { name: "Main navigation" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open navigation" }))
    const drawer = await screen.findByRole("dialog")
    expect(within(drawer).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    expect(within(drawer).getByRole("link", { name: "Events" })).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
