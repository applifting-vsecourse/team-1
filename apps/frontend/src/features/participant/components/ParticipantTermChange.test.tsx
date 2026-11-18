import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplication } from "@/features/participant/api/applications"
import { ParticipantTermChange } from "@/features/participant/components/ParticipantTermChange"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const term = (id: string, isSelected: boolean) => ({
  id,
  name: id,
  startsOn: "2027-07-04",
  endsOn: "2027-07-10",
  priceCzk: 4500,
  owedAfterChangeCzk: 0,
  paidCzk: 0,
  owedBeforeCancellationCzk: 0,
  owedAfterCancellationCzk: 0,
  overpaymentAfterCancellationCzk: 0,
  selected: isSelected,
})

const application = {
  id: "a1",
  eventName: "Camp",
  firstName: "Jana",
  lastName: "Nováková",
  terms: [{ termId: "t1", status: "CONFIRMED" }],
} as unknown as MyApplication

function setup(terms: ReturnType<typeof term>[]) {
  get.mockReturnValue({ json: () => Promise.resolve({ canChangeImmediately: false, terms }) })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ParticipantTermChange
        application={application}
        mode="change"
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

describe("ParticipantTermChange", () => {
  beforeEach(() => get.mockReset())

  it("keeps the new-term field disabled and opens no empty panel when no other term exists", async () => {
    setup([term("t1", true)])

    const trigger = await screen.findByRole("combobox", { name: "New term" })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveTextContent("No other term is available.")

    await userEvent.click(trigger)
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send request" })).toBeDisabled()
  })

  it("lets the participant open the new-term field when another term exists", async () => {
    setup([term("t1", true), term("t2", false)])

    expect(await screen.findByRole("combobox", { name: "New term" })).toBeEnabled()
  })
})
