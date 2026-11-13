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

import { organizerEventSchema } from "@/features/events/api/events"
import { DeleteEventSection } from "@/features/events/components/DeleteEventSection"

const base = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  organizationContactEmail: null,
  name: "Jarní víkend Lipno 2027",
  description: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 0,
  startsOn: null,
  endsOn: null,
  applicationsOpen: false,
  evaluationMode: "AUTOMATIC",
  cancellationStartsOn: null,
  cancellationTerms: null,
  evaluationModeLocked: false,
  hasApplications: false,
  missing: ["TERM", "ROOM"],
  terms: [],
}

function renderSection(event: object, deleteResponse?: () => Response) {
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
    component: () => <DeleteEventSection event={organizerEventSchema.parse(event)} />,
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

describe("DeleteEventSection", () => {
  it("deletes the event after confirmation and returns to the event list", async () => {
    const success = vi.spyOn(notify, "success")
    renderSection(base, () => new Response(null, { status: 204 }))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Delete event" }))
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveTextContent("Jarní víkend Lipno 2027")
    expect(dialog).toHaveTextContent("Delete event?")
    expect(dialog).toHaveTextContent("A deleted event cannot be restored.")
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

  it("turns into the blocked dialog when the event got an application meanwhile", async () => {
    renderSection(
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
    expect(await within(dialog).findByText("The event cannot be deleted")).toBeInTheDocument()
    expect(dialog).toHaveTextContent("The event already has an application.")
    expect(dialog).toHaveTextContent("A new application was submitted in the meantime.")
    expect(within(dialog).queryByRole("button", { name: "Delete event" })).not.toBeInTheDocument()
    // The footer button and the corner X of the dialog both close it.
    expect(within(dialog).getAllByRole("button", { name: "Close" })).toHaveLength(2)
    expect(screen.queryByText("Events list")).not.toBeInTheDocument()
  })

  it("shows the translated error and keeps the confirmation for any other failure", async () => {
    renderSection(
      base,
      () =>
        new Response(JSON.stringify({ statusCode: 500, code: "INTERNAL_ERROR", message: "x" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Delete event" }))
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete event" }),
    )

    const dialog = screen.getByRole("dialog")
    expect(await within(dialog).findByText("Could not delete the event")).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Delete event" })).toBeInTheDocument()
  })

  it("offers a destructive button when the event has no applications", async () => {
    renderSection(base)

    const button = await screen.findByRole("button", { name: "Delete event" })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute("data-variant", "destructive")
    expect(
      screen.getByText("An event without applications can be permanently deleted."),
    ).toBeInTheDocument()
  })

  it("disables the button and explains why when the event has applications", async () => {
    renderSection({ ...base, hasApplications: true })

    expect(
      await screen.findByText("The event cannot be deleted because it has applications."),
    ).toBeInTheDocument()
    const button = screen.getByRole("button", { name: "Delete event" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("data-variant", "ghost")
  })
})
