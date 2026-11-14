import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
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
    await userEvent.click(within(dialog).getByRole("combobox", { name: /^From/ }))
    await userEvent.click(await screen.findByRole("option", { name: "10" }))
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
    await userEvent.click(within(dialog).getByRole("combobox", { name: /^From/ }))
    await userEvent.click(await screen.findByRole("option", { name: "11" }))
    const [, , , endHours] = within(dialog).getAllByRole("combobox")
    expect(endHours).toHaveTextContent("12")
    await userEvent.click(endHours!)
    await userEvent.click(await screen.findByRole("option", { name: "10" }))
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
})
