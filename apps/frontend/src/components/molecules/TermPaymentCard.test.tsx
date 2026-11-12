import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TermPaymentCard } from "@/components/molecules/TermPaymentCard"

const base = {
  title: "12–18 Jul 2027",
  bankAccount: "123456789/0000",
  variableSymbol: "2027001201",
}

describe("TermPaymentCard", () => {
  it("shows the debt of a partly paid term with what to pay and where", () => {
    render(
      <TermPaymentCard
        {...base}
        status="PARTIALLY_PAID"
        dueCzk={4900}
        paidCzk={4400}
        owedCzk={500}
      />,
    )

    expect(screen.getByText("Partly paid")).toBeInTheDocument()
    expect(screen.getByText("Amount due").nextSibling).toHaveTextContent("4,900")
    expect(screen.getByText("Paid").nextSibling).toHaveTextContent("4,400")
    expect(screen.getByText("Left to pay").nextSibling).toHaveTextContent("500")
    expect(screen.getByText("Amount to pay")).toBeInTheDocument()
    expect(screen.getByText("123456789/0000")).toBeInTheDocument()
    expect(screen.getByText("2027001201")).toBeInTheDocument()
  })

  it("collapses a paid term to its dates and the badge until it is opened", async () => {
    const user = userEvent.setup()
    render(
      <TermPaymentCard
        {...base}
        status="PAID"
        dueCzk={4900}
        paidCzk={4900}
        owedCzk={0}
      />,
    )

    const toggle = screen.getByRole("button", { name: /^12–18 Jul 2027,\s?Paid$/ })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Amount due")).not.toBeInTheDocument()
    expect(screen.queryByText("Amount to pay")).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Amount due")).toBeInTheDocument()
    expect(screen.getByText("Paid", { selector: "dt" })).toBeInTheDocument()
    expect(screen.getByText("2027001201")).toBeInTheDocument()
    // Nothing is left to pay, so there is no amount to send.
    expect(screen.queryByText("Amount to pay")).not.toBeInTheDocument()
  })

  it("opens and closes a paid term from the keyboard", async () => {
    const user = userEvent.setup()
    render(
      <TermPaymentCard
        {...base}
        status="PAID"
        dueCzk={4900}
        paidCzk={4900}
        owedCzk={0}
      />,
    )

    await user.tab()
    expect(screen.getByRole("button", { name: /Paid/ })).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(screen.getByRole("button", { name: /Paid/ })).toHaveAttribute("aria-expanded", "true")
    await user.keyboard(" ")
    expect(screen.getByRole("button", { name: /Paid/ })).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps an overpaid term open, as an overpayment, without payment details", () => {
    render(
      <TermPaymentCard
        {...base}
        status="OVERPAID"
        dueCzk={4900}
        paidCzk={5400}
        owedCzk={-500}
      />,
    )

    expect(screen.getByText("Overpayment")).toBeInTheDocument()
    expect(screen.queryByText("Variable symbol")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Overpaid/ })).not.toBeInTheDocument()
  })

  it("says only that nothing is paid yet for a waitlisted term", () => {
    render(
      <TermPaymentCard
        {...base}
        status="WAITLISTED"
        dueCzk={0}
        paidCzk={0}
        owedCzk={0}
      />,
    )

    expect(screen.getByText("12–18 Jul 2027 · Waitlisted")).toBeInTheDocument()
    expect(screen.getByText("You don't pay anything yet.")).toBeInTheDocument()
    expect(screen.queryByText("Variable symbol")).not.toBeInTheDocument()
    expect(screen.queryByText("Amount due")).not.toBeInTheDocument()
  })

  it("renders the given action in a card with a debt", () => {
    render(
      <TermPaymentCard
        {...base}
        status="UNPAID"
        dueCzk={4900}
        paidCzk={0}
        owedCzk={4900}
        action={<button type="button">Record a payment</button>}
      />,
    )

    expect(screen.getByRole("button", { name: "Record a payment" })).toBeInTheDocument()
  })
})
