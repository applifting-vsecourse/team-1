import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { BoardAdminPage } from "@/features/board/components/BoardAdminPage"

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn<(path: string) => { json: () => Promise<unknown> }>(),
  post: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(() => Promise.resolve({})),
  put: vi.fn<(path: string, options?: unknown) => Promise<unknown>>(() => Promise.resolve({})),
  del: vi.fn<(path: string) => Promise<unknown>>(() => Promise.resolve({})),
}))
vi.mock("@/lib/api-client", () => ({ api: { get, post, put, delete: del } }))
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }))

const term = (id: string, name: string, startsOn: string, endsOn: string) => ({
  id,
  name,
  startsOn,
  endsOn,
})
const terms = [
  term("t1", "Letní týden", "2027-07-12", "2027-07-18"),
  term("t2", "Druhý týden", "2027-07-19", "2027-07-25"),
]
const posts = [
  {
    id: "p1",
    title: "Změna programu",
    createdAt: "2027-06-14T09:05:00.000Z",
    terms: [terms[0]],
    eventTermCount: 2,
  },
  {
    id: "p2",
    title: "Doplatek do 30. 6.",
    createdAt: "2027-06-09T09:05:00.000Z",
    terms,
    eventTermCount: 2,
  },
]

function serve(list: unknown[] | Error = posts) {
  get.mockImplementation((path) => ({
    json: () => {
      if (list instanceof Error) return Promise.reject(list)
      if (path.endsWith("/terms")) return Promise.resolve(terms)
      if (path.endsWith("/posts/p1")) {
        return Promise.resolve({ ...posts[0], body: "Výlet je ve čtvrtek." })
      }
      return Promise.resolve(list)
    },
  }))
}

function renderPage() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BoardAdminPage eventId="e1" />
    </QueryClientProvider>,
  )
}

describe("BoardAdminPage", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockClear()
    put.mockClear()
    del.mockClear()
  })

  it("lists the posts with their terms", async () => {
    serve()
    renderPage()

    const rows = await screen.findAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(within(rows[1]!).getByText("Změna programu")).toBeVisible()
    expect(within(rows[1]!).getByText("Letní týden")).toBeVisible()
    expect(within(rows[2]!).getByText("Both terms")).toBeVisible()
  })

  it("says what will appear when there is no post", async () => {
    serve([])
    renderPage()

    expect(await screen.findByText(/posts you add for the applicants/)).toBeVisible()
  })

  it("shows the error with a retry", async () => {
    serve(new Error("Server down"))
    renderPage()

    expect(await screen.findByText("The board could not be loaded.")).toBeVisible()
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible()
  })

  it("offers every term ticked and publishes the post", async () => {
    serve()
    renderPage()
    await userEvent.click(await screen.findByRole("button", { name: "New post" }))

    const dialog = within(await screen.findByRole("dialog"))
    const checkboxes = await dialog.findAllByRole("checkbox")
    expect(checkboxes).toHaveLength(2)
    for (const checkbox of checkboxes) expect(checkbox).toBeChecked()

    await userEvent.type(dialog.getByLabelText("Title"), "Odjezd")
    await userEvent.type(dialog.getByLabelText("Text"), "Sraz v 9:00")
    await userEvent.click(dialog.getByRole("button", { name: "Add post" }))

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("organizer/events/e1/board/posts", {
        json: { title: "Odjezd", body: "Sraz v 9:00", termIds: ["t1", "t2"] },
      })
    })
  })

  it("asks for the missing texts and a term before sending", async () => {
    serve()
    renderPage()
    await userEvent.click(await screen.findByRole("button", { name: "New post" }))
    const dialog = within(await screen.findByRole("dialog"))
    for (const checkbox of await dialog.findAllByRole("checkbox")) {
      await userEvent.click(checkbox)
    }

    await userEvent.click(dialog.getByRole("button", { name: "Add post" }))

    expect(await dialog.findByText("Enter a title.")).toBeVisible()
    expect(dialog.getByText("Enter the text.")).toBeVisible()
    expect(dialog.getByText("Choose at least one term.")).toBeVisible()
    expect(post).not.toHaveBeenCalled()
  })

  it("shows the server error as an alert and keeps the dialog", async () => {
    serve()
    post.mockRejectedValueOnce(new Error("Choose at least one term that is not cancelled."))
    renderPage()
    await userEvent.click(await screen.findByRole("button", { name: "New post" }))
    const dialog = within(await screen.findByRole("dialog"))
    await userEvent.type(await dialog.findByLabelText("Title"), "Odjezd")
    await userEvent.type(dialog.getByLabelText("Text"), "Sraz")

    await userEvent.click(dialog.getByRole("button", { name: "Add post" }))

    expect(await dialog.findByRole("alert")).toHaveTextContent("The post could not be saved.")
    expect(dialog.getByRole("alert")).toHaveTextContent("Choose at least one term")
  })

  it("edits a post with what is saved", async () => {
    serve()
    renderPage()
    const row = (await screen.findAllByRole("row"))[1]!
    await userEvent.click(within(row).getByRole("button", { name: "Edit" }))

    const dialog = within(await screen.findByRole("dialog"))
    expect(await dialog.findByLabelText("Title")).toHaveValue("Změna programu")
    expect(dialog.getByLabelText("Text")).toHaveValue("Výlet je ve čtvrtek.")
    const [first, second] = dialog.getAllByRole("checkbox")
    expect(first).toBeChecked()
    expect(second).not.toBeChecked()

    await userEvent.clear(dialog.getByLabelText("Title"))
    await userEvent.type(dialog.getByLabelText("Title"), "Nový nadpis")
    await userEvent.click(dialog.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(put).toHaveBeenCalledWith("organizer/events/e1/board/posts/p1", {
        json: { title: "Nový nadpis", body: "Výlet je ve čtvrtek.", termIds: ["t1"] },
      })
    })
  })

  it("deletes a post after a confirmation", async () => {
    serve()
    renderPage()
    const row = (await screen.findAllByRole("row"))[2]!
    await userEvent.click(within(row).getByRole("button", { name: "Delete" }))

    const dialog = within(await screen.findByRole("dialog"))
    expect(
      dialog.getByText("The post disappears for all applicants. This cannot be undone."),
    ).toBeVisible()
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(del).toHaveBeenCalledWith("organizer/events/e1/board/posts/p2")
    })
  })
})
