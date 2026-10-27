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
import { afterEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import { EventSetup } from "@/features/events/components/EventSetup"

const base = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  name: "Jarní víkend Lipno 2027",
  description: null,
  location: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 0,
  roomCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: false,
  missing: ["TERM", "ROOM"],
  terms: [],
}

function renderSetup(event: object, deleteResponse?: () => Response) {
  const json = { headers: { "Content-Type": "application/json" } }
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const method = input instanceof Request ? input.method : (init?.method ?? "GET")
    if (method === "DELETE" && deleteResponse) return Promise.resolve(deleteResponse())
    return Promise.resolve(new Response(JSON.stringify(event), json))
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventSetup eventId="e1" />,
  })
  const events = createRoute({
    getParentRoute: () => root,
    path: "/organizer/events",
    component: () => <p>Events list</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([page, events]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe("EventSetup", () => {
  it("shows what is missing and keeps the copy button off", async () => {
    renderSetup(base)

    expect(
      await screen.findByRole("heading", { name: "What is missing to open applications" }),
    ).toBeInTheDocument()
    expect(screen.getByText("0 of 2 done")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Add at least one term with a price" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Add at least one room" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copy application link" })).toBeDisabled()
  })

  it("keeps a single primary button: the first step to do", async () => {
    renderSetup(base)

    const addTerm = await screen.findByRole("link", { name: "Add a term and price" })
    expect(addTerm.className).toContain("bg-primary")
    expect(screen.getByRole("link", { name: "Add a room" }).className).not.toContain("bg-primary")
  })

  it("counts the finished step and drops its button", async () => {
    renderSetup({ ...base, termCount: 1, missing: ["ROOM"] })

    expect(await screen.findByText("1 of 2 done")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Add a term and price" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add a room" }).className).toContain("bg-primary")
  })

  it("copies the link of a ready event and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const success = vi.spyOn(notify, "success")
    renderSetup({ ...base, termCount: 2, roomCount: 3, applicationsOpen: true, missing: [] })

    await userEvent.click(await screen.findByRole("button", { name: "Copy application link" }))

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/apply/tok123`)
    expect(await screen.findByRole("button", { name: "Copy again" })).toBeEnabled()
    expect(success).toHaveBeenCalledWith("Link copied to the clipboard")
  })

  it("copies the application URL using the icon next to the link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const success = vi.spyOn(notify, "success")
    renderSetup({ ...base, termCount: 2, roomCount: 3, applicationsOpen: true, missing: [] })

    const icon = await screen.findByRole("button", { name: "Copy link" })
    const link = screen.getByRole("link", { name: `${window.location.origin}/apply/tok123` })
    expect(icon.parentElement).toBe(link.parentElement)
    await userEvent.click(icon)

    expect(writeText).toHaveBeenCalledWith(link.getAttribute("href"))
    expect(success).toHaveBeenCalledWith("Link copied to the clipboard")
  })
  it("deletes the event after confirmation and returns to the event list", async () => {
    const success = vi.spyOn(notify, "success")
    renderSetup(base, () => new Response(null, { status: 204 }))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Delete event" }))
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent("Jarní víkend Lipno 2027")
    expect(dialog).toHaveTextContent("Delete this event?")
    await user.click(within(dialog).getByRole("button", { name: "Delete event" }))

    expect(await screen.findByText("Events list")).toBeInTheDocument()
    const call = vi
      .mocked(globalThis.fetch)
      .mock.calls.map(([input, init]) => ({
        method: input instanceof Request ? input.method : init?.method,
        url: input instanceof Request ? input.url : String(input),
      }))
      .find((request) => request.method === "DELETE")
    expect(call?.url).toMatch(/organizer\/events\/e1$/)
    expect(success).toHaveBeenCalledWith("Event Jarní víkend Lipno 2027 has been deleted.")
  })

  it("keeps the dialog open and shows the error when the event has applications", async () => {
    renderSetup(
      base,
      () =>
        new Response(
          JSON.stringify({
            statusCode: 409,
            code: "EVENT_HAS_APPLICATIONS",
            message: "Event has applications",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Delete event" }))
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete event" }),
    )

    const dialog = screen.getByRole("dialog")
    expect(await within(dialog).findByText("Could not delete the event")).toBeInTheDocument()
    expect(dialog).toHaveTextContent("An event with applications cannot be deleted.")
    expect(screen.queryByText("Events list")).not.toBeInTheDocument()
  })
})
