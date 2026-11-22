import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import { BoardEntryCard } from "@/features/board/components/BoardEntryCard"

const { get } = vi.hoisted(() => ({
  get: vi.fn<(path: string) => { json: () => Promise<unknown> }>(),
}))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

function renderCard(summary: unknown) {
  get.mockReturnValue({ json: () => Promise.resolve(summary) })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <>
        <BoardEntryCard />
        <p>after</p>
      </>
    ),
  })
  const board = createRoute({
    getParentRoute: () => root,
    path: "/participant/board",
    component: () => <p>Board</p>,
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider
        router={createRouter({
          routeTree: root.addChildren([page, board]),
          history: createMemoryHistory({ initialEntries: ["/"] }),
        })}
      />
    </QueryClientProvider>,
  )
}

describe("BoardEntryCard", () => {
  beforeEach(() => get.mockReset())
  afterEach(async () => {
    await i18n.changeLanguage("en")
  })

  it("shows the number of new posts, the newest title and the way to the board", async () => {
    renderCard({ unreadCount: 3, latest: { id: "p1", title: "Změna programu" } })

    expect(await screen.findByRole("heading", { name: "Event information" })).toBeVisible()
    expect(screen.getByText("3 new")).toBeVisible()
    expect(screen.getByText("Změna programu")).toBeVisible()
    expect(screen.getByRole("link", { name: "Show all ›" })).toHaveAttribute(
      "href",
      "/participant/board",
    )
  })

  it("shows no number when everything is read", async () => {
    renderCard({ unreadCount: 0, latest: { id: "p1", title: "Změna programu" } })

    expect(await screen.findByText("Změna programu")).toBeVisible()
    expect(screen.queryByText(/ new$/)).not.toBeInTheDocument()
  })

  it("is not shown without a post", async () => {
    renderCard({ unreadCount: 0, latest: null })

    expect(await screen.findByText("after")).toBeVisible()
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
  })

  it.each([
    [1, "1 nový"],
    [3, "3 nové"],
    [5, "5 nových"],
  ])("declines the number %i in Czech", async (count, text) => {
    await i18n.changeLanguage("cs")
    renderCard({ unreadCount: count, latest: { id: "p1", title: "Titul" } })

    expect(await screen.findByText(text)).toBeVisible()
  })
})
