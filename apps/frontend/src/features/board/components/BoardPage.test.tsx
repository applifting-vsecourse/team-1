import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useParams,
} from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BoardPage } from "@/features/board/components/BoardPage"

const { get, post } = vi.hoisted(() => ({
  get: vi.fn<(path: string) => { json: () => Promise<unknown> }>(),
  post: vi.fn<(path: string) => Promise<unknown>>(() => Promise.resolve({})),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, post } }))
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))

const term = { id: "t1", name: "Letní týden", startsOn: "2027-07-12", endsOn: "2027-07-18" }
const item = (id: string, isNew: boolean) => ({
  id,
  title: `Příspěvek ${id}`,
  excerpt: `Text ${id}`,
  createdAt: "2027-06-14T09:05:00.000Z",
  eventName: "Letní kemp Lipno 2027",
  terms: [term],
  isNew,
})

/** Serves the list from `posts`; opening a post is what turns `isNew` off. */
function serve(posts: ReturnType<typeof item>[] | Error) {
  get.mockImplementation((path) => ({
    json: () => {
      if (posts instanceof Error) return Promise.reject(posts)
      if (path.startsWith("participant/board/posts/")) {
        const found = posts.find((post) => path.endsWith(`/${post.id}`))
        return Promise.resolve({ ...found, body: `Celý text ${found?.id}` })
      }
      return Promise.resolve(posts)
    },
  }))
  post.mockImplementation((path) => {
    const id = path.split("/").at(-2)
    const found = posts instanceof Error ? undefined : posts.find((post) => post.id === id)
    if (found) found.isNew = false
    return Promise.resolve({})
  })
}

function renderPage(postId?: string) {
  const root = createRootRoute()
  const list = createRoute({
    getParentRoute: () => root,
    path: "/participant/board",
    component: () => <BoardPage />,
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/participant/board/$postId",
    component: function Detail() {
      return <BoardPage postId={useParams({ strict: false }).postId} />
    },
  })
  const applications = createRoute({
    getParentRoute: () => root,
    path: "/participant",
    component: () => <p>Applications</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([list, detail, applications]),
    history: createMemoryHistory({
      initialEntries: [postId ? `/participant/board/${postId}` : "/participant/board"],
    }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe("BoardPage", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockClear()
  })

  it("lists the posts with a badge on the new ones", async () => {
    serve([item("p1", true), item("p2", false)])
    renderPage()

    expect(await screen.findByRole("link", { name: /Příspěvek p1/ })).toHaveTextContent("New")
    expect(screen.getByRole("link", { name: /Příspěvek p2/ })).not.toHaveTextContent("New")
    expect(screen.getByRole("heading", { level: 1, name: "Event information" })).toBeVisible()
    expect(post).not.toHaveBeenCalled()
  })

  it("marks a post as read when it is opened and the badge goes away", async () => {
    serve([item("p1", true)])
    renderPage()

    await userEvent.click(await screen.findByRole("link", { name: /Příspěvek p1/ }))

    expect(await screen.findByText("Celý text p1")).toBeVisible()
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("participant/board/posts/p1/read")
    })
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Příspěvek p1/ })).not.toHaveTextContent("New")
    })
  })

  it("does not mark a post that is already read", async () => {
    serve([item("p1", false)])
    renderPage("p1")

    expect(await screen.findByText("Celý text p1")).toBeVisible()
    expect(post).not.toHaveBeenCalled()
  })

  it("says what will appear on an empty board", async () => {
    serve([])
    renderPage()

    expect(await screen.findByText(/posts about your event will appear here/)).toBeVisible()
  })

  it("shows the error with a retry that loads again", async () => {
    serve(new Error("Server down"))
    renderPage()

    expect(await screen.findByText("Event information could not be loaded.")).toBeVisible()
    serve([item("p1", false)])
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(await screen.findByRole("link", { name: /Příspěvek p1/ })).toBeVisible()
  })
})
