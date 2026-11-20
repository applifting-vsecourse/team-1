import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ProgramPage } from "@/features/program/components/ProgramPage"

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const program = (terms: unknown[]) => ({ eventName: "Letní kemp", terms })
const term = {
  termId: "t1",
  termName: "Letní týden",
  startsOn: "2027-07-12",
  endsOn: "2027-07-14",
  blocks: [
    {
      id: "b1",
      date: "2027-07-13",
      startTime: "10:00",
      endTime: "12:00",
      name: "Dílny",
      place: "Chata A–C",
      description: "Výroba suvenýrů",
    },
  ],
}

function renderPage(data: unknown) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const method = input instanceof Request ? input.method : (init?.method ?? "GET")
    return Promise.resolve(
      method === "GET"
        ? new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
        : new Response(null, { status: 204 }),
    )
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <ProgramPage eventId="e1" />,
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
  return fetchMock
}

afterEach(() => vi.restoreAllMocks())

describe("ProgramPage", () => {
  it("draws a column per day of the term and the block over its time span", async () => {
    renderPage(program([term]))
    expect(await screen.findByRole("heading", { name: /Tue/ })).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "Program calendar" })).getAllByRole("heading"),
    ).toHaveLength(3)
    expect(screen.getByText("Dílny")).toBeInTheDocument()
    expect(screen.queryByText("10:00–12:00")).not.toBeInTheDocument()
  })

  it("opens all about a block on a click, with edit and delete for the organizer", async () => {
    renderPage(program([term]))
    await userEvent.click(await screen.findByRole("button", { name: "Show details of Dílny" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Výroba suvenýrů")).toBeInTheDocument()
    expect(within(dialog).getByText("Chata A–C")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Delete block" })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Edit" }))
    expect(await screen.findByRole("heading", { name: "Edit block" })).toBeInTheDocument()
  })

  it("warns that a block already exists at the chosen time", async () => {
    renderPage(program([{ ...term, startsOn: "2027-07-13" }]))
    await userEvent.click(await screen.findByRole("button", { name: "Add block" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^From/), { target: { value: "10:00" } })
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Dílny \(10:00–12:00\)/)
  })

  it("explains an event without terms", async () => {
    renderPage(program([]))
    expect(await screen.findByText(/no terms yet/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to terms" })).toBeInTheDocument()
  })

  it("says the program of a term is empty", async () => {
    renderPage(program([{ ...term, blocks: [] }]))
    expect(await screen.findByText(/empty so far/)).toBeInTheDocument()
  })

  it("asks for the name and for an end after the start before sending anything", async () => {
    const fetchMock = renderPage(program([term]))
    await userEvent.click(await screen.findByRole("button", { name: "Add block" }))
    const dialog = await screen.findByRole("dialog")
    // The block starts at 09:00 with minutes on 00; moving the start to 11:00 pushes the end along.
    fireEvent.change(within(dialog).getByLabelText(/^From/), { target: { value: "11:00" } })
    const endTime = within(dialog).getByLabelText(/^To/)
    expect(endTime).toHaveValue("12:00")
    fireEvent.change(endTime, { target: { value: "10:00" } })
    await userEvent.click(within(dialog).getByRole("button", { name: "Add block" }))
    expect(await within(dialog).findByText("Enter the block name.")).toBeInTheDocument()
    expect(within(dialog).getByText("The end must be after the start.")).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) => (input instanceof Request ? input.method : init?.method) === "POST",
      ),
    ).toBe(false)
  })

  it("saves a valid block and closes the dialog", async () => {
    const fetchMock = renderPage(program([term]))
    await userEvent.click(await screen.findByRole("button", { name: "Add block" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText(/^Block name/), "Snídaně")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add block" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    const post = fetchMock.mock.calls.find(
      ([input, init]) => (input instanceof Request ? input.method : init?.method) === "POST",
    )
    const request = post?.[0]
    expect(request instanceof Request ? request.url : String(request)).toContain(
      "organizer/events/e1/program/terms/t1/blocks",
    )
  })

  async function copyIntoOverlap({
    shouldFailReload = false,
  }: { shouldFailReload?: boolean } = {}) {
    const block = (id: string, name: string, startTime: string, endTime: string) => ({
      id,
      date: "2027-07-13",
      startTime,
      endTime,
      name,
      place: "Louka",
      description: "",
    })
    const target = { ...term, blocks: [block("x", "Hry", "10:30", "12:00")] }
    const source = {
      termId: "t2",
      termName: "Zdroj",
      startsOn: "2027-07-19",
      endsOn: "2027-07-21",
      blocks: [{ ...block("a", "Dílny", "10:00", "11:00"), date: "2027-07-20" }],
    }
    let blocks = target.blocks
    let isCopied = false
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const request = input instanceof Request ? input : new Request(String(input), init)
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } })
      if (request.method === "POST") {
        blocks = [...blocks, block("c", "Dílny", "10:00", "11:00")]
        isCopied = true
        return Promise.resolve(
          json({
            copied: 1,
            skipped: 0,
            overlaps: [{ date: "2027-07-13", first: "Dílny", second: "Hry" }],
          }),
        )
      }
      if (request.method === "DELETE") {
        blocks = blocks.filter((item) => item.id !== "x")
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      if (shouldFailReload && isCopied) return Promise.resolve(new Response(null, { status: 500 }))
      return Promise.resolve(json(program([{ ...target, blocks }, source])))
    })
    const root = createRootRoute()
    const page = createRoute({
      getParentRoute: () => root,
      path: "/",
      component: () => <ProgramPage eventId="e1" />,
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider
          router={createRouter({
            routeTree: root.addChildren([page]),
            history: createMemoryHistory({ initialEntries: ["/"] }),
          })}
        />
      </QueryClientProvider>,
    )

    await userEvent.click(await screen.findByRole("button", { name: "Copy program" }))
    const copyDialog = await screen.findByRole("dialog")
    await userEvent.click(within(copyDialog).getByRole("combobox", { name: "Source term" }))
    await userEvent.click(await screen.findByRole("option", { name: /Zdroj/ }))
    await userEvent.click(within(copyDialog).getByRole("button", { name: "Copy 1 block" }))
    expect(await screen.findByText(/Dílny and Hry on .* overlap\./)).toBeInTheDocument()
  }

  it("drops the copy overlap warning once the overlap is resolved", async () => {
    await copyIntoOverlap()
    await userEvent.click(await screen.findByRole("button", { name: "Show details of Hry" }))
    await userEvent.click(await screen.findByRole("button", { name: "Delete block" }))
    const confirm = await screen.findByRole("dialog")
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete block" }))
    await waitFor(() => {
      expect(screen.queryByText(/Dílny and Hry on/)).not.toBeInTheDocument()
    })
    expect(screen.queryByText(/time overlap/)).not.toBeInTheDocument()
  })

  it("keeps the overlaps the copy reported when the program cannot be reloaded after it", async () => {
    await copyIntoOverlap({ shouldFailReload: true })
    expect(screen.getByText(/Dílny and Hry on .* overlap\./)).toBeInTheDocument()
  })
})
