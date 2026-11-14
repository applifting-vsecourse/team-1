import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import { eventKeys } from "@/features/events/api/events"
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

vi.mock("@/lib/notify", async (importOriginal) => {
  const original = await importOriginal<{ notify: Record<string, unknown> }>()
  return { notify: { ...original.notify, success: vi.fn() } }
})

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
    const url = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify(url.endsWith("/terms") ? [] : current), json)
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

function renderCancellation(start: string | null = null) {
  const json = { headers: { "Content-Type": "application/json" } }
  const writes: unknown[] = []
  let current = { ...event, cancellationStartsOn: start }
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const request = input as Request
    if (request.method === "PUT" && request.url.endsWith("/cancellation-start")) {
      const body = (await request.clone().json()) as { cancellationStartsOn: string | null }
      writes.push(body)
      current = { ...current, cancellationStartsOn: body.cancellationStartsOn }
      return new Response(JSON.stringify(current), json)
    }
    return new Response(JSON.stringify(request.url.endsWith("/terms") ? [] : current), json)
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <EventSettings eventId="e1" />
    </QueryClientProvider>,
  )
  return {
    writes,
    refetch: async (start: string | null) => {
      current = { ...current, cancellationStartsOn: start }
      await act(() => client.invalidateQueries({ queryKey: eventKeys.detail("e1") }))
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2027-06-01T10:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

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
    await vi.waitFor(() => expect(notify.success).toHaveBeenCalledWith("Evaluation mode saved."))
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

  it("saves a real cancellation day and confirms with a toast", async () => {
    const { writes } = renderCancellation()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("checkbox", { name: "Turn on approval" }))
    await user.type(screen.getByRole("textbox", { name: "Approve requests from" }), "01/07/2027")
    await user.click(screen.getByRole("button", { name: "Save settings" }))

    await vi.waitFor(() => expect(writes).toEqual([{ cancellationStartsOn: "2027-07-01" }]))
    await vi.waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith(
        "Approval is set.",
        "Term changes and cancellations need approval from 1 Jul 2027.",
      ),
    )
  })

  it("clears a saved date and leaves the immediate-change explanation", async () => {
    const { writes } = renderCancellation("2027-07-01")
    const user = userEvent.setup()

    await user.click(await screen.findByRole("checkbox", { name: "Turn on approval" }))
    await user.click(screen.getByRole("button", { name: "Save settings" }))

    await vi.waitFor(() => expect(writes).toEqual([{ cancellationStartsOn: null }]))
    await vi.waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith(
        "Approval is off.",
        "New term changes and cancellations are now carried out immediately, without approval.",
      ),
    )
    expect(
      screen.getByText(/Approval is off\. New term changes and cancellations/),
    ).toBeInTheDocument()
  })

  it("rejects an impossible day before calling the API", async () => {
    const { writes } = renderCancellation()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("checkbox", { name: "Turn on approval" }))
    await user.type(screen.getByRole("textbox", { name: "Approve requests from" }), "31/02/2027")
    await user.click(screen.getByRole("button", { name: "Save settings" }))

    expect(screen.getByText("Enter a valid calendar date.")).toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it("rejects a new cancellation day in the past before calling the API", async () => {
    const { writes } = renderCancellation()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("checkbox", { name: "Turn on approval" }))
    await user.type(screen.getByRole("textbox", { name: "Approve requests from" }), "01/01/2020")
    await user.click(screen.getByRole("button", { name: "Save settings" }))

    expect(screen.getByText("The approval start date must not be in the past.")).toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it("rejects changing a saved day to another day in the past", async () => {
    const { writes } = renderCancellation("2027-07-01")
    const user = userEvent.setup()

    const input = await screen.findByRole("textbox", { name: "Approve requests from" })
    await user.clear(input)
    await user.type(input, "01/01/2020")
    await user.click(screen.getByRole("button", { name: "Save settings" }))

    expect(screen.getByText("The approval start date must not be in the past.")).toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it("keeps a saved day that has already passed valid without offering Save", async () => {
    const { writes } = renderCancellation("2020-01-01")

    expect(await screen.findByRole("textbox", { name: "Approve requests from" })).toHaveValue(
      "01/01/2020",
    )
    expect(notify.success).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument()
    expect(
      screen.queryByText("The approval start date must not be in the past."),
    ).not.toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it("offers Save only while the form differs from the stored state", async () => {
    renderCancellation()
    const user = userEvent.setup()
    const save = () => screen.queryByRole("button", { name: "Save settings" })

    const checkbox = await screen.findByRole("checkbox", { name: "Turn on approval" })
    expect(checkbox).not.toBeChecked()
    expect(save()).not.toBeInTheDocument()

    await user.click(checkbox)
    expect(save()).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Approve requests from" })).toBeVisible()

    await user.click(checkbox)
    expect(save()).not.toBeInTheDocument()
  })

  it("offers Save after a saved date is changed or switched off, and hides it again when restored", async () => {
    renderCancellation("2027-07-01")
    const user = userEvent.setup()
    const save = () => screen.queryByRole("button", { name: "Save settings" })

    const checkbox = await screen.findByRole("checkbox", { name: "Turn on approval" })
    expect(checkbox).toBeChecked()
    expect(save()).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument()

    const input = screen.getByRole("textbox", { name: "Approve requests from" })
    await user.clear(input)
    await user.type(input, "02/07/2027")
    expect(save()).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, "01/07/2027")
    expect(save()).not.toBeInTheDocument()

    await user.click(checkbox)
    expect(save()).toBeInTheDocument()
  })

  it("follows server refetches in an untouched form without offering stale writes", async () => {
    const { writes, refetch } = renderCancellation()
    const checkbox = await screen.findByRole("checkbox", { name: "Turn on approval" })

    await refetch("2027-07-01")
    await waitFor(() => expect(checkbox).toBeChecked())
    expect(screen.getByRole("textbox", { name: "Approve requests from" })).toHaveValue("01/07/2027")
    expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument()

    await refetch("2027-07-02")
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Approve requests from" })).toHaveValue(
        "02/07/2027",
      ),
    )
    await refetch(null)
    await waitFor(() => expect(checkbox).not.toBeChecked())
    expect(screen.queryByRole("textbox", { name: "Approve requests from" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it("preserves a user's edited date across a server refetch", async () => {
    const { writes, refetch } = renderCancellation("2027-07-01")
    const user = userEvent.setup()
    const input = await screen.findByRole("textbox", { name: "Approve requests from" })
    await user.clear(input)
    await user.type(input, "03/07/2027")

    await refetch("2027-07-02")
    expect(input).toHaveValue("03/07/2027")
    await user.click(screen.getByRole("button", { name: "Save settings" }))
    await vi.waitFor(() => expect(writes).toEqual([{ cancellationStartsOn: "2027-07-03" }]))
    await vi.waitFor(() =>
      expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument(),
    )
    await refetch(null)
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Turn on approval" })).not.toBeChecked(),
    )
  })

  it("preserves a user's switch-off across a server refetch", async () => {
    const { writes, refetch } = renderCancellation("2027-07-01")
    const user = userEvent.setup()
    await user.click(await screen.findByRole("checkbox", { name: "Turn on approval" }))
    await refetch("2027-07-02")

    expect(screen.getByRole("checkbox", { name: "Turn on approval" })).not.toBeChecked()
    await user.click(screen.getByRole("button", { name: "Save settings" }))
    await vi.waitFor(() => expect(writes).toEqual([{ cancellationStartsOn: null }]))
  })

  it("follows refetches again after the user undoes their edit", async () => {
    const { refetch } = renderCancellation()
    const user = userEvent.setup()
    const checkbox = await screen.findByRole("checkbox", { name: "Turn on approval" })
    await user.click(checkbox)
    await user.click(checkbox)
    await refetch("2027-07-01")

    await waitFor(() => expect(checkbox).toBeChecked())
    expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument()
  })
})
