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
import { HTTPError } from "ky"
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
  eventTermCount: 2,
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

const httpError = (status: number) =>
  new HTTPError(
    new Response(null, { status }),
    new Request("http://localhost/api/participant/board/posts/p1/read", { method: "POST" }),
    {} as ConstructorParameters<typeof HTTPError>[2],
  )

function renderPage(postId?: string, applicationId?: string) {
  const root = createRootRoute()
  const list = createRoute({
    getParentRoute: () => root,
    path: "/participant/board",
    component: () => <BoardPage applicationId={applicationId} />,
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/participant/board/$postId",
    component: function Detail() {
      return (
        <BoardPage
          postId={useParams({ strict: false }).postId}
          applicationId={applicationId}
        />
      )
    },
  })
  const applications = createRoute({
    getParentRoute: () => root,
    path: "/participant",
    component: () => <p>Applications</p>,
  })
  const application = createRoute({
    getParentRoute: () => root,
    path: "/participant/applications/$applicationId",
    component: () => <p>Application</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([list, detail, applications, application]),
    history: createMemoryHistory({
      initialEntries: [postId ? `/participant/board/${postId}` : "/participant/board"],
    }),
  })
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          // No waiting between the attempts of a mutation that retries.
          defaultOptions: { queries: { retry: false }, mutations: { retryDelay: 0 } },
        })
      }
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

  it("tries the read mark again after a passing error and the badge goes away", async () => {
    serve([item("p1", true)])
    post.mockRejectedValueOnce(httpError(503))
    renderPage("p1")

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Příspěvek p1/ })).not.toHaveTextContent("New")
    })
    expect(post).toHaveBeenCalledTimes(2)
  })

  it("gives up after three more attempts when the server stays unavailable", async () => {
    serve([item("p1", true)])
    post.mockImplementation(() => Promise.reject(httpError(503)))
    renderPage("p1")

    await waitFor(() => {
      expect(post).toHaveBeenCalledTimes(4)
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(post).toHaveBeenCalledTimes(4)
  })

  it("does not repeat a read mark the server refused", async () => {
    serve([item("p1", true)])
    post.mockImplementation(() => Promise.reject(httpError(403)))
    renderPage("p1")

    expect(await screen.findByText("Celý text p1")).toBeVisible()
    await waitFor(() => {
      expect(post).toHaveBeenCalled()
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(post).toHaveBeenCalledTimes(1)
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

  it("leads back to the list of applications when the board was not opened from one", async () => {
    serve([item("p1", false)])
    renderPage()

    expect(await screen.findByRole("link", { name: "Back to applications" })).toHaveAttribute(
      "href",
      "/participant",
    )
  })

  it("leads back to the application the board was opened from", async () => {
    serve([item("p1", false)])
    renderPage(undefined, "a1")

    expect(await screen.findByRole("link", { name: "Back to application" })).toHaveAttribute(
      "href",
      "/participant/applications/a1",
    )
    expect(await screen.findByRole("link", { name: /Příspěvek p1/ })).toHaveAttribute(
      "href",
      "/participant/board/p1?applicationId=a1",
    )
  })
})
