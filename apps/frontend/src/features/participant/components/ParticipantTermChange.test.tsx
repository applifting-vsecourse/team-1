import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { MyApplication } from "@/features/participant/api/applications"
import { ParticipantTermChange } from "@/features/participant/components/ParticipantTermChange"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { get } }))

const term = (
  id: string,
  isSelected: boolean,
  payment: Partial<
    Record<
      | "paidCzk"
      | "owedBeforeCancellationCzk"
      | "owedAfterChangeCzk"
      | "overpaymentAfterCancellationCzk",
      number
    >
  > = {},
) => ({
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
  ...payment,
})

const application = {
  id: "a1",
  eventName: "Camp",
  firstName: "Jana",
  lastName: "Nováková",
  terms: [{ termId: "t1", status: "CONFIRMED" }],
} as unknown as MyApplication

const withStatus = (status: string) =>
  ({ ...application, terms: [{ termId: "t1", status }] }) as unknown as MyApplication

function setup(
  terms: ReturnType<typeof term>[],
  {
    mode = "change",
    isImmediate = false,
    status = "CONFIRMED",
  }: { mode?: "change" | "cancel"; isImmediate?: boolean; status?: string } = {},
) {
  get.mockReturnValue({
    json: () => Promise.resolve({ canChangeImmediately: isImmediate, terms }),
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ParticipantTermChange
        application={withStatus(status)}
        mode={mode}
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

  describe("payment impact", () => {
    const paid = {
      paidCzk: 4900,
      owedBeforeCancellationCzk: 0,
      overpaymentAfterCancellationCzk: 4900,
    }

    it("tells an applicant who paid nothing that there is nothing to settle and warns only about the bed", async () => {
      setup([term("t1", true)], { mode: "cancel", isImmediate: true })

      expect(
        await screen.findByText("You haven’t paid anything yet, so there is nothing to settle."),
      ).toBeVisible()
      expect(screen.getByText("Your bed is released immediately after you confirm")).toBeVisible()
      expect(screen.queryByText(/refund/i)).not.toBeInTheDocument()
    })

    it("shows the paid amount and one warning block when a paid term is cancelled", async () => {
      setup([term("t1", true, paid)], { mode: "cancel", isImmediate: true })

      expect(await screen.findByText(/You paid/)).toHaveTextContent("CZK 4,900")
      expect(screen.getByText("What happens after you confirm")).toBeVisible()
      expect(screen.getByText("Your bed is released immediately.")).toBeVisible()
      expect(screen.getByText(/Paid money is not refunded automatically/)).toBeVisible()
      expect(screen.queryByText(/overpayment|debt/i)).not.toBeInTheDocument()
    })

    it("shows the paid part of a partly paid term and that the rest is not needed", async () => {
      setup([term("t1", true, { paidCzk: 2000, owedBeforeCancellationCzk: 2900 })], {
        mode: "cancel",
        isImmediate: true,
      })

      expect(
        await screen.findByText(/You paid .* of .*You don’t need to pay the rest\./),
      ).toBeVisible()
    })

    it("says payments do not apply to a waitlisted participant and shows no warning", async () => {
      setup([term("t1", true)], { mode: "cancel", isImmediate: true, status: "WAITLISTED" })

      expect(
        await screen.findByText("You are on the waitlist, so payments don’t apply."),
      ).toBeVisible()
      expect(screen.queryByText(/released/)).not.toBeInTheDocument()
    })

    it("puts the bed, the missing transfer and the refund into one warning when changing a paid term", async () => {
      setup([term("t1", true, paid), term("t2", false, { owedAfterChangeCzk: 5600 })], {
        mode: "change",
        isImmediate: true,
      })

      expect(await screen.findByText("What happens after you confirm")).toBeVisible()
      expect(screen.getByText("Your original bed is released immediately.")).toBeVisible()
      expect(screen.getByText("Your payment is not moved to the new term.")).toBeVisible()
      expect(screen.getByText(/the organizer handles refunds/)).toBeVisible()
      expect(screen.getByText(/You will pay .* for the new term\./)).toHaveTextContent("CZK 5,600")
    })

    it("says the organizer decides when the cancellation needs approval", async () => {
      setup([term("t1", true, paid)], { mode: "cancel", isImmediate: false })

      expect(await screen.findByText("The organizer approves the request")).toBeVisible()
      expect(screen.getByText("The bed is released only after approval.")).toBeVisible()
      expect(screen.getByText(/nothing is refunded automatically/)).toBeVisible()
      expect(screen.getByText("Impact after approval")).toBeVisible()
    })
  })
})
