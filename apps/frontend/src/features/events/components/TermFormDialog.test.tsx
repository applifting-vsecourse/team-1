import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"

import type { EventTerm } from "@/features/events/api/terms"
import { TermFormDialog } from "@/features/events/components/TermFormDialog"

const term: EventTerm = {
  id: "t1",
  eventId: "e1",
  name: "First week",
  startsOn: "2027-08-02",
  endsOn: "2027-08-08",
  priceCzk: 6900,
  roomMode: "GENDERED",
  roomCount: 2,
  capacity: 60,
  confirmedCount: 18,
  waitlistedCount: 1,
  toEvaluateCount: 0,
  cancelledAt: null,
  cancelReason: null,
}

afterEach(() => vi.restoreAllMocks())

it("keeps the term editor open while saving and allows closing after a failure", async () => {
  const user = userEvent.setup()
  const { promise, resolve } = Promise.withResolvers<Response>()
  const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(promise)
  const onClose = vi.fn()
  const onCancelTerm = vi.fn()

  render(
    <QueryClientProvider client={new QueryClient()}>
      <TermFormDialog
        eventId="e1"
        eventName="Summer camp"
        term={term}
        onClose={onClose}
        onSaved={vi.fn()}
        onCancelTerm={onCancelTerm}
      />
    </QueryClientProvider>,
  )

  const name = screen.getByRole("textbox", { name: "Term name" })
  await user.type(name, " updated")
  await user.click(screen.getByRole("button", { name: "Save changes" }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

  const close = screen.getByRole("button", { name: "Close" })
  const cancel = screen.getByRole("button", { name: "Cancel" })
  const cancelTerm = screen.getByRole("button", { name: "Cancel term" })
  expect(close).toBeDisabled()
  expect(cancel).toBeDisabled()
  expect(cancelTerm).toBeDisabled()
  await user.click(document.querySelector("[data-slot=dialog-overlay]")!)
  await user.keyboard("{Escape}")
  expect(onClose).not.toHaveBeenCalled()
  expect(onCancelTerm).not.toHaveBeenCalled()

  resolve(new Response("{}", { status: 400 }))
  expect(await screen.findByRole("alert")).toBeVisible()
  expect(name).toHaveValue("First week updated")
  expect(close).toBeEnabled()
  expect(cancel).toBeEnabled()
  expect(cancelTerm).toBeEnabled()
  await user.keyboard("{Escape}")
  expect(onClose).toHaveBeenCalledOnce()
})
