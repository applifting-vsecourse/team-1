import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationForm } from "@/features/application-form/components/ApplicationForm"
import type { ApplicationFormValues } from "@/features/application-form/lib/application-form-schema"

const event: PublicEvent = {
  name: "Summer camp 2027",
  description: null,
  location: null,
  terms: [
    { id: "t1", name: "Week 1", startsOn: "2027-07-04", endsOn: "2027-07-10", priceCzk: 4500 },
    { id: "t2", name: "Week 2", startsOn: "2027-07-11", endsOn: "2027-07-17", priceCzk: 4900 },
  ],
}

// Radix's select and radio group measure and scroll things jsdom doesn't have.
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

const submitSpy = () => vi.fn<(values: ApplicationFormValues) => void | Promise<unknown>>()

const participantCard = (number: number) => {
  const heading = screen.getByRole("heading", { name: new RegExp(`^Participant ${number}`) })
  const card = heading.closest<HTMLElement>("[data-slot=card]")
  if (!card) throw new Error(`No card around participant ${number}`)
  return card
}

const priceCard = () => {
  const card = screen
    .getByRole("heading", { name: "Price of selected terms" })
    .closest<HTMLElement>("[data-slot=card]")
  if (!card) throw new Error("No price card")
  return card
}

const totalPrice = () =>
  within(priceCard()).getByText("Total").nextElementSibling?.textContent?.replace(/\s/g, " ")

async function fillParticipant(
  number: number,
  data: { first: string; last: string; birth: string; gender: "Woman" | "Man"; term: RegExp },
) {
  const card = within(participantCard(number))
  await userEvent.type(card.getByLabelText("First name *"), data.first)
  await userEvent.type(card.getByLabelText("Last name *"), data.last)
  await userEvent.type(card.getByLabelText("Date of birth *"), data.birth)
  await userEvent.click(card.getByRole("combobox", { name: "Gender *" }))
  await userEvent.click(await screen.findByRole("option", { name: data.gender }))
  await userEvent.click(card.getByRole("checkbox", { name: data.term }))
}

const anna = {
  first: "Anna",
  last: "Nováková",
  birth: "2010-05-17",
  gender: "Woman",
  term: /11–17 Jul/,
} as const

describe("ApplicationForm", () => {
  it("supports typing a date and keeps the hint accessible when the date is out of range", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    const birthDate = screen.getByLabelText("Date of birth *")
    const hint = "Type a date or choose from the calendar. E.g. 25.10.1990."
    expect(birthDate).toHaveAttribute("type", "date")
    expect(birthDate).toHaveAttribute("min", "1900-01-01")
    expect(birthDate).toHaveAccessibleDescription(hint)

    await userEvent.type(birthDate, "1899-12-31")
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    expect(
      await screen.findByText("Enter a valid date from 1 January 1900 to today."),
    ).toBeInTheDocument()
    expect(birthDate).toHaveAccessibleDescription(
      `${hint} Enter a valid date from 1 January 1900 to today.`,
    )
    expect(birthDate).toHaveValue("1899-12-31")
  })

  it("offers the terms as dates and prices, as in the design", () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    expect(screen.getByText("Choose terms (at least one) *")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /^4–10 Jul 2027\s?·\s?Week 1\s?·\s?CZK\s4,500$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /^11–17 Jul 2027\s?·\s?Week 2\s?·\s?CZK\s4,900$/ }),
    ).toBeInTheDocument()
  })

  it("shows the price of the ticked terms per participant and updates it with every change", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    expect(totalPrice()).toBe("CZK 0")
    expect(within(priceCard()).getByText("No term")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: /4–10 Jul/ }))
    await userEvent.click(screen.getByRole("checkbox", { name: /11–17 Jul/ }))
    expect(totalPrice()).toBe("CZK 9,400")
    expect(within(priceCard()).getByText("2 terms")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: /11–17 Jul/ }))
    expect(totalPrice()).toBe("CZK 4,500")
    expect(within(priceCard()).getByText("1 term")).toBeInTheDocument()
  })

  it("adds up several participants in the total, each under their name", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Add another participant" }))
    await userEvent.type(within(participantCard(1)).getByLabelText("First name *"), "Anna")
    await userEvent.type(within(participantCard(1)).getByLabelText("Last name *"), "Nováková")
    await userEvent.click(within(participantCard(1)).getByRole("checkbox", { name: /4–10 Jul/ }))
    await userEvent.click(within(participantCard(2)).getByRole("checkbox", { name: /11–17 Jul/ }))

    expect(totalPrice()).toBe("CZK 9,400")
    const rows = within(priceCard()).getAllByRole("listitem")
    expect(rows[0]).toHaveTextContent(/^Anna Nováková1 termCZK\s4,500$/)
    expect(rows[1]).toHaveTextContent(/^Participant 21 termCZK\s4,900$/)
  })

  it("shows the designed message at every empty required field and does not submit", async () => {
    const onSubmit = submitSpy()
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    expect(await screen.findByText("Enter the first name.")).toBeInTheDocument()
    expect(screen.getByText("Enter the last name.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid date from 1 January 1900 to today.")).toBeInTheDocument()
    expect(screen.getByText("Choose Woman or Man.")).toBeInTheDocument()
    expect(screen.getByText("Choose at least one term.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid e-mail address.")).toBeInTheDocument()
    expect(
      screen.getByText("Consent to the processing of personal data is required to submit."),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits a complete application with the shared contact data", async () => {
    const onSubmit = submitSpy()
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )

    await fillParticipant(1, anna)
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
    await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    expect(onSubmit.mock.lastCall?.[0]).toEqual({
      email: "anna@example.com",
      consent: true,
      participants: [
        {
          firstName: "Anna",
          lastName: "Nováková",
          birthDate: "2010-05-17",
          gender: "FEMALE",
          termIds: ["t2"],
        },
      ],
    })
  })

  it("names the participant in the card title as soon as there is a name", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    expect(screen.getByRole("heading", { name: "Participant 1" })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("First name *"), "Anna")
    await userEvent.type(screen.getByLabelText("Last name *"), "Nováková")
    expect(
      screen.getByRole("heading", { name: "Participant 1 · Anna Nováková" }),
    ).toBeInTheDocument()
  })

  it("adds participants with their own terms; only the later ones can be removed", async () => {
    const onSubmit = submitSpy()
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByRole("button", { name: /Remove participant/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Add another participant" }))
    expect(screen.queryByRole("button", { name: "Remove participant 1" })).not.toBeInTheDocument()

    await fillParticipant(1, { ...anna, term: /4–10 Jul/ })
    await fillParticipant(2, {
      first: "Matěj",
      last: "Novák",
      birth: "2012-01-02",
      gender: "Man",
      term: /11–17 Jul/,
    })
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
    await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    const termsPerParticipant = onSubmit.mock.lastCall?.[0].participants.map(
      (participant) => participant.termIds,
    )
    expect(termsPerParticipant).toEqual([["t1"], ["t2"]])

    await userEvent.click(screen.getByRole("button", { name: "Remove participant 2" }))
    expect(screen.queryByRole("heading", { name: /^Participant 2/ })).not.toBeInTheDocument()
  })

  it("rejects a date of birth in the future", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    await userEvent.type(screen.getByLabelText("Date of birth *"), "2999-01-01")
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    expect(
      await screen.findByText("Enter a valid date from 1 January 1900 to today."),
    ).toBeInTheDocument()
  })

  it("disables the button while submitting, so a second click creates no second application", async () => {
    let finish: (() => void) | undefined
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )

    await fillParticipant(1, anna)
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
    await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    const button = await screen.findByRole("button", { name: "Submitting…" })
    expect(button).toBeDisabled()
    expect(screen.getByRole("status")).toHaveTextContent("Please wait for the confirmation.")
    await userEvent.click(button)
    expect(onSubmit).toHaveBeenCalledOnce()

    finish?.()
  })

  it("shows why a submission failed", () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
        errorMessage="Something went wrong on the server. Please try again."
      />,
    )

    expect(
      screen.getByText("Something went wrong on the server. Please try again."),
    ).toBeInTheDocument()
  })
})
