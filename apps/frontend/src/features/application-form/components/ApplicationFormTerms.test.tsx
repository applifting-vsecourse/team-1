import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationForm } from "@/features/application-form/components/ApplicationForm"

/** `count` weekly terms from 2 Jan 2027; term N costs 4 000 + N CZK so a total shows which were ticked. */
const makeEvent = (count: number): PublicEvent => ({
  name: "Summer camp 2027",
  description: null,
  location: null,
  terms: Array.from({ length: count }, (_, index) => {
    const start = new Date(Date.UTC(2027, 0, 2 + index * 7))
    const end = new Date(start.getTime() + 6 * 864e5)
    return {
      id: `t${index + 1}`,
      name: `Week ${index + 1}`,
      startsOn: start.toISOString().slice(0, 10),
      endsOn: end.toISOString().slice(0, 10),
      priceCzk: 4000 + index + 1,
    }
  }),
})

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const participantTerms = () => {
  const card = screen
    .getByRole("heading", { name: /^Participant 1/ })
    .closest<HTMLElement>("[data-slot=card]")
  if (!card) throw new Error("No participant card")
  return within(card)
}

const termCheckboxes = () => participantTerms().queryAllByRole("checkbox", { name: /Week \d+/ })

const termCheckbox = (position: number): HTMLElement => {
  const checkbox = termCheckboxes()[position]
  if (!checkbox) throw new Error(`No term checkbox at ${position}`)
  return checkbox
}

const summary = () => {
  const section = screen.getByRole("region", { name: /Summer camp 2027/ })
  return within(section)
}

const priceTotal = () => {
  const card = screen
    .getByRole("heading", { name: "Price of selected terms" })
    .closest<HTMLElement>("[data-slot=card]")
  if (!card) throw new Error("No price card")
  return within(card).getByText("Total").nextElementSibling?.textContent?.replace(/\s/g, " ")
}

const renderForm = (count: number) =>
  render(
    <ApplicationForm
      event={makeEvent(count)}
      onSubmit={vi.fn()}
    />,
  )

describe("ApplicationForm with many terms (#732)", () => {
  it("shows three terms as before with no folding", () => {
    renderForm(3)

    expect(termCheckboxes()).toHaveLength(3)
    expect(screen.queryByRole("button", { name: /Show/ })).not.toBeInTheDocument()
    expect(summary().getAllByRole("listitem")).toHaveLength(3)
    expect(summary().queryByText(/more terms/)).not.toBeInTheDocument()
  })

  it("folds twelve terms to eight and unfolds and folds them again", async () => {
    renderForm(12)

    expect(termCheckboxes()).toHaveLength(8)
    expect(summary().getAllByRole("listitem")).toHaveLength(3)
    expect(summary().getByText("and 9 more terms")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Show 4 more terms" }))
    expect(termCheckboxes()).toHaveLength(12)
    expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )

    await userEvent.click(screen.getByRole("button", { name: "Show fewer" }))
    expect(termCheckboxes()).toHaveLength(8)
  })

  it("folds a hundred terms to eight", () => {
    renderForm(100)

    expect(termCheckboxes()).toHaveLength(8)
    expect(screen.getByRole("button", { name: "Show 92 more terms" })).toBeVisible()
    expect(summary().getByText("and 97 more terms")).toBeInTheDocument()
  })

  it("shows nine terms whole instead of hiding one", () => {
    renderForm(9)

    expect(termCheckboxes()).toHaveLength(9)
    expect(screen.queryByRole("button", { name: /Show/ })).not.toBeInTheDocument()
  })

  it("keeps choosing terms and the price summary working, also for an unfolded term", async () => {
    renderForm(12)

    await userEvent.click(termCheckbox(0))
    expect(priceTotal()).toBe("CZK 4,001")

    await userEvent.click(screen.getByRole("button", { name: "Show 4 more terms" }))
    await userEvent.click(termCheckbox(11))
    expect(priceTotal()).toBe("CZK 8,013")

    // A ticked term in the folded part keeps the list open, so nothing ticked is ever hidden.
    expect(screen.queryByRole("button", { name: "Show fewer" })).not.toBeInTheDocument()
    expect(termCheckboxes()).toHaveLength(12)
  })
})
