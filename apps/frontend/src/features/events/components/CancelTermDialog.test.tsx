import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CancelTermDialog } from "@/features/events/components/CancelTermDialog"

const term = {
  id: "t1",
  eventId: "e1",
  name: "Srpnový turnus",
  startsOn: "2027-08-02",
  endsOn: "2027-08-08",
  priceCzk: 6900,
  roomMode: "GENDERED" as const,
  roomCount: 2,
  capacity: 60,
  confirmedCount: 18,
  waitlistedCount: 1,
  toEvaluateCount: 0,
  cancelledAt: null,
  cancelReason: null,
}

function renderDialog(answer: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>) {
  const onClose = vi.fn()
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input, init) => Promise.resolve(answer(input, init)))
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CancelTermDialog
        eventId="e1"
        eventName="Letní kemp Lipno 2027"
        term={term}
        onClose={onClose}
        onCancelled={vi.fn()}
      />
    </QueryClientProvider>,
  )
  return { fetchMock, onClose }
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } })

describe("CancelTermDialog", () => {
  afterEach(() => vi.restoreAllMocks())

  it("ignores outside clicks and blocks closing while cancellation is pending", async () => {
    const { promise, resolve } = Promise.withResolvers<Response>()
    const { onClose } = renderDialog((input, init) => {
      const method = input instanceof Request ? input.method : init?.method
      return method === "POST" ? promise : json([term])
    })
    await userEvent.click(await screen.findByRole("checkbox"))
    await userEvent.click(document.querySelector("[data-slot=dialog-overlay]")!)
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Cancel term" }))
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled()
    await userEvent.keyboard("{Escape}")
    expect(onClose).not.toHaveBeenCalled()
    resolve(new Response("{}", { status: 400 }))
    expect(await screen.findByRole("alert", { name: "" })).toBeVisible()
  })

  it("blocks the cancellation while the counts cannot be refreshed, until a retry succeeds", async () => {
    let isFailing = true
    renderDialog(() => (isFailing ? new Response("{}", { status: 500 }) : json([term])))

    expect(await screen.findByText("Could not refresh the application counts")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel term" })).toBeDisabled()

    isFailing = false
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    await userEvent.click(await screen.findByRole("checkbox"))
    expect(screen.getByRole("button", { name: "Cancel term" })).toBeEnabled()
  })
})
