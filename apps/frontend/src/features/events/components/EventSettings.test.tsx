import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EventSettings } from "@/features/events/components/EventSettings"

// Radix's radio group measures things jsdom doesn't have.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

const event = {
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
  evaluationMode: "AUTOMATIC",
  evaluationModeLocked: false,
  missing: ["TERM", "ROOM"],
  terms: [],
}

function renderSettings(current: object, patchResponse?: () => Response) {
  const json = { headers: { "Content-Type": "application/json" } }
  const patches: { url: string; body: unknown }[] = []
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const method = input instanceof Request ? input.method : (init?.method ?? "GET")
    if (method === "PATCH" && patchResponse) {
      const request = input as Request
      patches.push({ url: request.url, body: await request.clone().json() })
      return patchResponse()
    }
    return new Response(JSON.stringify(current), json)
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EventSettings eventId="e1" />
    </QueryClientProvider>,
  )
  return patches
}

afterEach(() => vi.restoreAllMocks())

describe("EventSettings", () => {
  it("offers both modes with automatic preselected", async () => {
    renderSettings(event)

    expect(await screen.findByRole("radio", { name: "Automatic" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Manual" })).not.toBeChecked()
  })

  it("saves the chosen mode", async () => {
    const patches = renderSettings(event, () => new Response(JSON.stringify(event)))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("radio", { name: "Manual" }))
    await user.click(screen.getByRole("button", { name: "Save mode" }))

    await vi.waitFor(() => expect(patches).toHaveLength(1))
    expect(patches[0]!.url).toContain("/organizer/events/e1/evaluation-mode")
    expect(patches[0]!.body).toEqual({ evaluationMode: "MANUAL" })
  })

  it("shows the translated error when the server says the mode is locked", async () => {
    renderSettings(
      event,
      () =>
        new Response(JSON.stringify({ statusCode: 409, code: "EVALUATION_MODE_LOCKED" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole("radio", { name: "Manual" }))
    await user.click(screen.getByRole("button", { name: "Save mode" }))

    expect(await screen.findByText(/already accepts applications/)).toBeInTheDocument()
  })

  it("explains why a locked mode cannot be changed", async () => {
    renderSettings({ ...event, applicationsOpen: true, evaluationModeLocked: true })

    expect(await screen.findByText("Automatic · locked")).toBeInTheDocument()
    expect(
      screen.getByText("Applications are open, so the mode can no longer be changed."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save mode" })).not.toBeInTheDocument()
  })
})
