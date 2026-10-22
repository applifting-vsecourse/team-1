import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PaymentApplication } from "@/features/event-overview/api/payments"
import { PaymentEditor } from "@/features/event-overview/components/PaymentEditor"

const { savePayment, cancelPayment } = vi.hoisted(() => ({
  savePayment: vi.fn(),
  cancelPayment: vi.fn(),
}))
vi.mock("@/features/event-overview/api/payments", () => ({ savePayment, cancelPayment }))

const payment = {
  id: "p1",
  amountCzk: 3000,
  createdAt: "2027-03-10T12:00:00Z",
  recordedByName: "Eva",
}
const application: PaymentApplication = {
  id: "a1",
  eventId: "e1",
  eventName: "Camp",
  firstName: "Adam",
  lastName: "Test",
  code: "C-0047",
  terms: [],
  payments: [],
  amountDueCzk: 6900,
  amountPaidCzk: 0,
  amountOwedCzk: 6900,
}

function setup(isEditing = false) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <PaymentEditor
        application={
          isEditing
            ? { ...application, payments: [payment], amountPaidCzk: 3000, amountOwedCzk: 3900 }
            : application
        }
        payment={isEditing ? payment : undefined}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), onClose, invalidate }
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        return undefined
      }
      unobserve() {
        return undefined
      }
      disconnect() {
        return undefined
      }
    },
  )
  vi.clearAllMocks()
  savePayment.mockResolvedValue(undefined)
  cancelPayment.mockResolvedValue(undefined)
})

describe("PaymentEditor", () => {
  it("records the full amount by omitting the field and invalidates application queries", async () => {
    const { user, onClose, invalidate } = setup()
    expect(screen.getByText(/After saving, amount owed:.*0/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save payment" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(savePayment).toHaveBeenCalledWith("a1", undefined, undefined)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["eventOverview"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["participant", "applications"] })
  })

  it("previews and records a partial amount", async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText("Amount paid (optional)"), "3000")
    expect(screen.getByText(/After saving, amount owed:.*3,900/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save payment" }))
    await waitFor(() => expect(savePayment).toHaveBeenCalledWith("a1", 3000, undefined))
  })

  it("edits the existing amount without adding the previous payment again", async () => {
    const { user } = setup(true)
    const input = screen.getByLabelText("Amount paid (optional)")
    expect(input).toHaveValue("3000")
    await user.clear(input)
    await user.type(input, "2000")
    expect(screen.getByText(/After saving, amount owed:.*4,900/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save change" }))
    await waitFor(() => expect(savePayment).toHaveBeenCalledWith("a1", 2000, payment))
  })

  it("cancels a payment by unchecking Paid", async () => {
    const { user } = setup(true)
    await user.click(screen.getByRole("checkbox", { name: "Paid" }))
    expect(screen.getByLabelText("Amount paid (optional)")).toBeDisabled()
    expect(screen.getByText(/After saving, amount owed:.*6,900/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save change" }))
    await waitFor(() => expect(cancelPayment).toHaveBeenCalledWith("a1", payment))
    expect(savePayment).not.toHaveBeenCalled()
  })

  it.each(["-1", "0.5", "abc", "2147483648"])(
    "validates %s without making a request",
    async (value) => {
      const { user } = setup()
      await user.type(screen.getByLabelText("Amount paid (optional)"), value)
      await user.click(screen.getByRole("button", { name: "Save payment" }))
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Some fields are not filled in correctly.",
      )
      expect(savePayment).not.toHaveBeenCalled()
    },
  )

  it("keeps the form open on a server error so the user can retry", async () => {
    savePayment.mockRejectedValueOnce(new Error("Payment could not be saved"))
    const { user, onClose } = setup()
    await user.click(screen.getByRole("button", { name: "Save payment" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Payment could not be saved")
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Save payment" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it("disables submit while a request is pending and Cancel makes no request", async () => {
    const { user, onClose } = setup()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(savePayment).not.toHaveBeenCalled()
    savePayment.mockReturnValue(new Promise(vi.fn()))
    await user.click(screen.getByRole("button", { name: "Save payment" }))
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "Paid" })).toBeDisabled()
  })
})
