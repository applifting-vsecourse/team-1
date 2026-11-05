import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PaymentApplication } from "@/features/event-overview/api/payments"
import { PaymentEditor } from "@/features/event-overview/components/PaymentEditor"

const { recordPayment, recordRefund } = vi.hoisted(() => ({
  recordPayment: vi.fn(),
  recordRefund: vi.fn(),
}))
vi.mock("@/features/event-overview/api/payments", () => ({ recordPayment, recordRefund }))

const application: PaymentApplication = {
  id: "a1",
  eventId: "e1",
  eventName: "Camp",
  bankAccount: "123456789/0000",
  firstName: "Adam",
  lastName: "Test",
  code: "C-0047",
  terms: [
    {
      termId: "t1",
      termNumber: 1,
      name: null,
      variableSymbol: "12001",
      owedCzk: 6900,
      dueCzk: 6900,
      paidCzk: 0,
      refundableCzk: 0,
      paymentStatus: "UNPAID",
      paymentDueAt: null,
      status: "CONFIRMED",
      priceCzk: 6900,
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
    },
  ],
  payments: [],
  amountDueCzk: 6900,
  amountPaidCzk: 0,
  amountOwedCzk: 6900,
  payableCzk: 6900,
  refundableTermId: null,
}
const secondTerm: PaymentApplication["terms"][number] = {
  termId: "t2",
  termNumber: 2,
  name: "Letní termín 2",
  variableSymbol: "12002",
  owedCzk: 700,
  dueCzk: 5600,
  paidCzk: 4900,
  refundableCzk: 0,
  paymentStatus: "PARTIALLY_PAID",
  paymentDueAt: null,
  status: "CONFIRMED",
  priceCzk: 5600,
  startsOn: "2027-07-19",
  endsOn: "2027-07-25",
}
const label = "Amount of this payment (CZK)"
function setup(paidCzk = 0) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <PaymentEditor
        application={{
          ...application,
          terms: [
            {
              ...application.terms[0]!,
              owedCzk: 6900 - paidCzk,
              dueCzk: 6900,
              paidCzk,
              refundableCzk: Math.max(0, paidCzk - 6900),
            },
          ],
          refundableTermId: paidCzk > 6900 ? "t1" : null,
          amountPaidCzk: paidCzk,
          amountOwedCzk: 6900 - paidCzk,
          payableCzk: Math.max(0, 6900 - paidCzk),
        }}
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
  recordPayment.mockResolvedValue(undefined)
})

describe("PaymentEditor", () => {
  it("defaults to refunding the whole overpayment and supports partial refunds", async () => {
    const { user, onClose } = setup(7400)
    await user.click(screen.getByRole("radio", { name: "Refund" }))
    const input = screen.getByLabelText("Refunded amount (CZK)")
    expect(input).toHaveValue("500")
    expect(screen.getByText("After saving, left to refund").nextSibling).toHaveTextContent(/0/)
    await user.clear(input)
    await user.type(input, "200")
    expect(screen.getByText("After saving, left to refund").nextSibling).toHaveTextContent(/300/)
    await user.click(screen.getByRole("button", { name: /Record refund.*200/ }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(recordRefund).toHaveBeenCalledWith("a1", expect.any(String), 200, "t1")
    expect(recordPayment).not.toHaveBeenCalled()
  })

  it.each(["0", "-1", "0.5", ""])("blocks invalid refund %s", async (value) => {
    const { user } = setup(7400)
    await user.click(screen.getByRole("radio", { name: "Refund" }))
    const input = screen.getByLabelText("Refunded amount (CZK)")
    await user.clear(input)
    if (value) await user.type(input, value)
    await user.click(screen.getByRole("button", { name: "Record refund" }))
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter a positive whole amount.*500/)
    expect(recordRefund).not.toHaveBeenCalled()
  })

  it("disables the refund while no term has an overpayment", () => {
    setup(3000)
    expect(screen.getByRole("radio", { name: "Refund" })).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Payment" })).toBeChecked()
  })

  it("offers the refund for the term the backend names, with its overpayment as the limit", async () => {
    const { user } = setup(7400)
    await user.click(screen.getByRole("radio", { name: "Refund" }))
    expect(screen.getByRole("combobox", { name: "Term" })).toHaveTextContent(/Jul 2027/)
    expect(screen.getByText("Overpayment to refund").nextSibling).toHaveTextContent(/500/)
  })

  it("records a payment for the term chosen in the dialog", async () => {
    const { user } = setup(3000)
    await user.click(screen.getByRole("combobox", { name: "Term" }))
    await user.click(screen.getByRole("option", { name: /Jul 2027/ }))
    await user.click(screen.getByRole("button", { name: /Record payment.*3,900/ }))
    await waitFor(() =>
      expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 3900, "t1"),
    )
  })

  it("says the refund exceeds the overpayment, apart from other invalid values", async () => {
    const { user } = setup(7400)
    await user.click(screen.getByRole("radio", { name: "Refund" }))
    const input = screen.getByLabelText("Refunded amount (CZK)")
    await user.clear(input)
    await user.type(input, "501")
    await user.click(screen.getByRole("button", { name: "Record refund" }))
    expect(screen.getByRole("alert")).toHaveTextContent(/must not exceed the overpayment of.*500/)
    await user.clear(input)
    await user.type(input, "0")
    await user.click(screen.getByRole("button", { name: "Record refund" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a positive whole amount")
    expect(screen.queryByText("After saving, left to refund")).not.toBeInTheDocument()
  })

  it("shows a refund the server rejected as an alert with its message", async () => {
    recordRefund.mockRejectedValueOnce(new Error("The term does not belong to this application."))
    const { user } = setup(7400)
    await user.click(screen.getByRole("radio", { name: "Refund" }))
    await user.click(screen.getByRole("button", { name: /Record refund.*500/ }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("The refund could not be recorded")
    expect(alert).toHaveTextContent("The term does not belong to this application.")
  })

  it("names a term by its name and dates in the choice", async () => {
    const { user } = setup(3000)
    await user.click(screen.getByRole("combobox", { name: "Term" }))
    expect(screen.getByRole("option", { name: /Jul 2027/ })).toBeInTheDocument()
  })

  it("defaults to settling the balance and sends the amount shown on the button", async () => {
    const { user, onClose, invalidate } = setup()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getByText("After saving, amount owed").nextSibling).toHaveTextContent(/0/)
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 6900)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["eventOverview"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["participant", "applications"] })
  })

  it("offers to settle only the outstanding balance without an amount field", async () => {
    const { user } = setup(3000)
    expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Settle the remaining.*3,900/ })).toBeChecked()
    expect(screen.getByRole("button", { name: /Record payment.*3,900/ })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    await waitFor(() => expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 3900))
  })

  it.each(["1000", "1 000", "1,000"])(
    "adds a new instalment %s on top of previous payments",
    async (value) => {
      const { user } = setup(3000)
      await user.click(screen.getByRole("radio", { name: "Record another amount" }))
      await user.type(screen.getByLabelText(label), value)
      expect(screen.getByText("After saving, amount owed").nextSibling).toHaveTextContent(/2,900/)
      await user.click(screen.getByRole("button", { name: /^Record payment/ }))
      await waitFor(() =>
        expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 1000),
      )
    },
  )

  it("requires an explicit amount when the application is fully paid and previews an overpayment", async () => {
    const { user } = setup(6900)
    expect(
      screen.getByText("The application is paid. Enter the amount of the additional payment."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    expect(recordPayment).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText("Amount of this payment (CZK)"), "500")
    expect(screen.getByText("After saving, overpayment").nextSibling).toHaveTextContent(/500/)
    expect(screen.getByRole("alert")).toHaveTextContent("Payment exceeds the remaining balance")
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    await waitFor(() => expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 500))
  })

  it.each(["0", "-1", "0.5", "0,5", "abc", "2147483648"])(
    "rejects %s without recording a receipt",
    async (value) => {
      const { user } = setup()
      await user.click(screen.getByRole("radio", { name: "Record another amount" }))
      await user.type(screen.getByLabelText(label), value)
      await user.click(screen.getByRole("button", { name: /^Record payment/ }))
      expect(screen.getByRole("alert")).toHaveTextContent("Enter a positive whole amount in CZK.")
      expect(screen.queryByText("After saving, amount owed")).not.toBeInTheDocument()
      expect(recordPayment).not.toHaveBeenCalled()
    },
  )

  it("keeps a stable submission id on retry so a lost response cannot duplicate a receipt", async () => {
    recordPayment.mockRejectedValueOnce(new Error("Payment could not be saved"))
    const { user, onClose } = setup()
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Payment could not be saved")
    const requestId: unknown = recordPayment.mock.calls[0]?.[1]
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(recordPayment).toHaveBeenLastCalledWith("a1", requestId, 6900)
  })

  it("Back makes no request and submit is disabled while saving", async () => {
    const { user, onClose } = setup()
    await user.click(screen.getByRole("button", { name: "Back" }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(recordPayment).not.toHaveBeenCalled()
    recordPayment.mockReturnValue(new Promise(vi.fn()))
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Record another amount" })).toBeDisabled()
  })

  it("requires a custom amount and can switch back to settling the balance", async () => {
    const { user } = setup(3000)
    await user.click(screen.getByRole("radio", { name: "Record another amount" }))
    await user.click(screen.getByRole("button", { name: /^Record payment/ }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a positive whole amount in CZK.")
    expect(recordPayment).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText(label), "1000")
    expect(screen.getByRole("button", { name: /Record payment.*1,000/ })).toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: /Settle the remaining/ }))
    expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Record payment.*3,900/ }))
    await waitFor(() => expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 3900))
  })

  it("warns immediately when the entered amount exceeds the debt and removes the warning when corrected", async () => {
    const { user } = setup(3000)
    await user.click(screen.getByRole("radio", { name: "Record another amount" }))
    const input = screen.getByLabelText(label)
    await user.type(input, "3900")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    await user.clear(input)
    await user.type(input, "4400")
    expect(screen.getByRole("alert")).toHaveTextContent(/overpayment will be.*500/)
    expect(recordPayment).not.toHaveBeenCalled()
    await user.clear(input)
    await user.type(input, "4000")
    expect(screen.getByRole("alert")).toHaveTextContent(/overpayment will be.*100/)
    await user.clear(input)
    await user.type(input, "3900")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByText("After saving, amount owed").nextSibling).toHaveTextContent(/0/)
  })

  it("adds to an existing overpayment but records only the amount of the new receipt", async () => {
    const { user } = setup(7400)
    expect(screen.queryByRole("radio", { name: /Settle the remaining/ })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(label), "200")
    expect(screen.getByRole("alert")).toHaveTextContent(/overpayment will be.*700/)
    expect(screen.getByText("After saving, overpayment").nextSibling).toHaveTextContent(/700/)
    await user.click(screen.getByRole("button", { name: /Record payment.*200/ }))
    await waitFor(() => expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 200))
  })
  it("pays one term only: its own amounts, the term in the title and its id in the request", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const onClose = vi.fn()
    render(
      <QueryClientProvider client={client}>
        <PaymentEditor
          application={{
            ...application,
            terms: [application.terms[0]!, secondTerm],
            amountDueCzk: 12500,
            amountPaidCzk: 4900,
            amountOwedCzk: 7600,
            payableCzk: 7600,
          }}
          term={secondTerm}
          onClose={onClose}
        />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()

    expect(screen.getByRole("dialog")).toHaveTextContent("19–25 Jul 2027")
    expect(screen.getByText("Amount due").nextSibling).toHaveTextContent("5,600")
    expect(screen.getByText("Paid so far").nextSibling).toHaveTextContent("4,900")
    expect(screen.getByText("Left to pay").nextSibling).toHaveTextContent("700")
    expect(screen.getByRole("radio", { name: /Settle the remaining.*700/ })).toBeChecked()

    await user.click(screen.getByRole("button", { name: /Record payment.*700/ }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(recordPayment).toHaveBeenCalledWith("a1", expect.any(String), 700, "t2")
  })
})
