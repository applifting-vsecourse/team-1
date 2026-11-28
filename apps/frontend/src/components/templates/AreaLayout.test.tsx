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

function renderLayout(width: "reading" | "wide" = "wide") {
  const root = createRootRoute({
    component: () => (
      <AreaLayout
        width={width}
        mobileMenu={<button type="button">Account menu</button>}
        notifications={<button type="button">Notifications</button>}
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
})

describe("AreaLayout without a top bar (Figma F4 and F5)", () => {
  it("has no top bar or drawer: the bell is next to the logo and the menu in the mobile header", async () => {
    renderLayout()

    const sidebar = await screen.findByRole("complementary", { name: "Main navigation" })
    expect(within(sidebar).getByRole("button", { name: "Notifications" })).toBeInTheDocument()
    expect(within(sidebar).getByRole("link", { name: "Events" })).toBeInTheDocument()
    expect(within(sidebar).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    const header = screen.getByRole("banner")
    expect(header).toHaveClass("md:hidden")
    expect(within(header).getByRole("button", { name: "Account menu" })).toBeInTheDocument()
    expect(within(header).getByRole("button", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Open navigation" })).not.toBeInTheDocument()
  })

  it("centres the content in one column, 800 px for reading and 1200 px for organizer tables", async () => {
    const { unmount } = renderLayout("reading")
    const heading = await screen.findByRole("heading", { name: "Event overview" })
    expect(heading.parentElement).toHaveClass("mx-auto", "max-w-200")
    unmount()

    renderLayout("wide")
    const wide = await screen.findByRole("heading", { name: "Event overview" })
    expect(wide.parentElement).toHaveClass("mx-auto", "max-w-300")
  })
})
