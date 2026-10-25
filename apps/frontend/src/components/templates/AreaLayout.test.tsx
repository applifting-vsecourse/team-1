import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { AreaLayout } from "@/components/templates/AreaLayout"

function renderLayout() {
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <AreaLayout
        roleLabel="Organizer"
        width="wide"
        nav={<a href="/events">Events</a>}
        account={<button type="button">Eva Malá</button>}
      >
        <p>Page</p>
      </AreaLayout>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe("AreaLayout", () => {
  it("puts the account at the bottom of the sidebar, not in the top bar", async () => {
    renderLayout()

    const sidebar = await screen.findByRole("complementary")
    expect(within(sidebar).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Eva Malá" })).toHaveLength(1)
  })

  it("keeps language and theme in the top bar and out of the drawer", async () => {
    renderLayout()

    expect(await screen.findByRole("button", { name: "Change language" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }))
    const drawer = await screen.findByRole("dialog")
    expect(within(drawer).getByRole("button", { name: "Eva Malá" })).toBeInTheDocument()
    expect(within(drawer).queryByText("Language")).not.toBeInTheDocument()
    expect(within(drawer).queryByText("Appearance")).not.toBeInTheDocument()
  })
})
