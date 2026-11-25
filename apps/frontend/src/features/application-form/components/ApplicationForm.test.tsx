import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
const scrollIntoView = vi.fn()
Element.prototype.scrollIntoView = scrollIntoView

const submitSpy = () => vi.fn<(values: ApplicationFormValues) => void | Promise<void>>()

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
  birth: "17/05/2010",
  gender: "Woman",
  term: /11–17 Jul/,
} as const

describe("ApplicationForm", () => {
  it("submits each participant's pronouns independently and leaves a blank value optional", async () => {
    const user = userEvent.setup()
    const onSubmit = submitSpy()
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Add another participant" }))
    await fillParticipant(1, anna)
    await fillParticipant(2, { ...anna, first: "Adam", last: "Novák", gender: "Man" })
    const first = within(participantCard(1)).getByRole("textbox", { name: "Pronouns (optional)" })
    const second = within(participantCard(2)).getByRole("textbox", { name: "Pronouns (optional)" })
    expect(first).toHaveAttribute("placeholder", "E.g. she/her")
    expect(second).toHaveValue("")
    await user.type(first, "  she/her  ")
    await user.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
    await user.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await user.click(screen.getByRole("button", { name: "Continue to review" }))
    await user.click(screen.getByRole("button", { name: "Submit application" }))
    const participants = onSubmit.mock.lastCall?.[0].participants
    expect(participants?.[0]?.pronouns).toBe("she/her")
    expect(participants?.[1]?.pronouns).toBeUndefined()
  })

  it("supports typing a date and links the error when the date is out of range", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    const birthDate = screen.getByLabelText("Date of birth *")
    expect(birthDate).toHaveAttribute("type", "text")
    expect(birthDate).toHaveAttribute("placeholder", "DD/MM/YYYY")

    await userEvent.type(birthDate, "31/12/1899")
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

    expect(await screen.findByText("Enter a valid date of birth.")).toBeInTheDocument()
    expect(birthDate).toHaveAccessibleDescription("Enter a valid date of birth.")
    expect(birthDate).toHaveValue("31/12/1899")
  })

  it("keeps a date that is not a day in the field and asks for the format", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    const birthDate = screen.getByLabelText("Date of birth *")
    await userEvent.type(birthDate, "31/02/2010")
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

    expect(
      await screen.findByText("Enter the date as DD/MM/YYYY, e.g. 04/05/2011."),
    ).toBeInTheDocument()
    expect(birthDate).toHaveValue("31/02/2010")
    expect(birthDate).toBeInvalid()
  })

  it("offers the terms as dates and prices, as in the design", () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    expect(screen.getByText("Choose at least one term *")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /^4–10 Jul 2027\s?·\s?Week 1\s?·\s?CZK\s4,500$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /^11–17 Jul 2027\s?·\s?Week 2\s?·\s?CZK\s4,900$/ }),
    ).toBeInTheDocument()
  })

  it("explains why the gender is asked in a popover that opens by keyboard and links to the individual accommodation (#528)", async () => {
    const user = userEvent.setup()
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    // The long text under the select is gone; the help sits behind a labelled button.
    expect(screen.queryByText(/to assign rooms and count beds/)).not.toBeInTheDocument()
    const help = screen.getByRole("button", { name: "Why do we ask about gender?" })
    help.focus()
    await user.keyboard("{Enter}")
    expect(
      await screen.findByText(/We need your gender to assign rooms and count beds/),
    ).toBeVisible()

    await user.click(
      screen.getByRole("button", {
        name: "Neither option fits? Arrange accommodation individually",
      }),
    )
    await vi.waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "I’d like individual accommodation" }),
      ).toHaveFocus(),
    )
  })

  it("tells the individual accommodation apart from a roommate wish", () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    expect(screen.getByText(/Roommate wishes come later/)).toBeVisible()
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

    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

    expect(await screen.findByText("Enter the first name.")).toBeInTheDocument()
    expect(screen.getByText("Enter the last name.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid date of birth.")).toBeInTheDocument()
    expect(screen.getByText("Choose Woman or Man.")).toBeInTheDocument()
    expect(screen.getByText("Choose at least one term.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid e-mail.")).toBeInTheDocument()
    expect(screen.getByText("Confirm your consent before submitting.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sums up the errors above the participants and goes to the first one", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

    expect(await screen.findByText("Correct 7 errors in the form")).toBeInTheDocument()
    const first = within(participantCard(1)).getByLabelText("First name *")
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
    expect(await screen.findByText("Correct 6 errors in the form")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Go to the first error" }))
    expect(first).toHaveFocus()
  })

  describe("moving to the first invalid field", () => {
    it("focuses the first field and scrolls its item into view", async () => {
      render(
        <ApplicationForm
          event={event}
          onSubmit={submitSpy()}
        />,
      )
      scrollIntoView.mockClear()

      await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

      await screen.findByText("Enter the first name.")
      const first = within(participantCard(1)).getByLabelText("First name *")
      expect(first).toHaveFocus()
      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "nearest" }))
    })

    it("focuses the gender select when it is the first thing missing, with its error linked", async () => {
      render(
        <ApplicationForm
          event={event}
          onSubmit={submitSpy()}
        />,
      )
      const card = within(participantCard(1))
      await userEvent.type(card.getByLabelText("First name *"), "Jana")
      await userEvent.type(card.getByLabelText("Last name *"), "Nováková")
      await userEvent.type(card.getByLabelText("Date of birth *"), "2012-05-01")

      await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

      const gender = await card.findByRole("combobox", { name: "Gender *" })
      await screen.findByText("Choose Woman or Man.")
      expect(gender).toHaveFocus()
      expect(gender).toHaveAttribute("aria-invalid", "true")
      expect(gender.getAttribute("aria-describedby")).toContain(
        screen.getByText("Choose Woman or Man.").id,
      )
    })

    it("focuses the first term when no term is chosen", async () => {
      render(
        <ApplicationForm
          event={event}
          onSubmit={submitSpy()}
        />,
      )
      const card = within(participantCard(1))
      await userEvent.type(card.getByLabelText("First name *"), "Jana")
      await userEvent.type(card.getByLabelText("Last name *"), "Nováková")
      await userEvent.type(card.getByLabelText("Date of birth *"), "2012-05-01")
      await userEvent.click(card.getByRole("combobox", { name: "Gender *" }))
      await userEvent.click(await screen.findByRole("option", { name: "Woman" }))

      await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

      await screen.findByText("Choose at least one term.")
      const firstTerm = card.getAllByRole("checkbox")[0]!
      expect(firstTerm).toHaveFocus()
      expect(firstTerm.getAttribute("aria-describedby")).toContain(
        screen.getByText("Choose at least one term.").id,
      )
    })
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
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Review your application" })).toHaveFocus()
    expect(screen.getByText("anna@example.com")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Edit contact" }))
    expect(screen.getByLabelText("Contact e-mail *")).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))
    await userEvent.click(screen.getByRole("button", { name: "Back to editing" }))
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("anna@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))
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
          individualAccommodation: false,
          accommodationRequest: "",
          termIds: ["t2"],
        },
      ],
    })
  })

  describe("individual accommodation (US-38)", () => {
    const note = () => screen.queryByLabelText("Note for the organizer")

    it("asks for a note only after the box is ticked and says who sees it", async () => {
      render(
        <ApplicationForm
          event={event}
          onSubmit={submitSpy()}
        />,
      )
      const card = within(participantCard(1))
      expect(
        card.getByText(
          "If room assignment by gender doesn’t suit you. Only the organizers will see it.",
        ),
      ).toBeInTheDocument()
      expect(note()).not.toBeInTheDocument()

      await userEvent.click(
        card.getByRole("checkbox", { name: "I’d like individual accommodation" }),
      )
      expect(note()).toBeInTheDocument()
      // The gender stays required next to it.
      expect(card.getByRole("combobox", { name: "Gender *" })).toBeVisible()
    })

    it("sits below the terms and shows how much of the 2,000 characters is used", async () => {
      render(
        <ApplicationForm
          event={event}
          onSubmit={submitSpy()}
        />,
      )
      const card = within(participantCard(1))
      const terms = card.getByRole("group", { name: /Choose at least one term/ })
      const box = card.getByRole("checkbox", {
        name: "I’d like individual accommodation",
      })
      expect(terms.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

      await userEvent.click(box)
      expect(card.getByText("0 / 2,000")).toBeInTheDocument()
      await userEvent.type(note()!, "Ground floor")
      expect(card.getByText("12 / 2,000")).toBeInTheDocument()
    })

    it("submits the request with its note", async () => {
      const onSubmit = submitSpy()
      render(
        <ApplicationForm
          event={event}
          onSubmit={onSubmit}
        />,
      )
      await fillParticipant(1, anna)
      await userEvent.click(
        screen.getByRole("checkbox", { name: "I’d like individual accommodation" }),
      )
      await userEvent.type(note()!, "Ground floor, please.")
      await userEvent.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
      await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
      await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))
      await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

      expect(onSubmit.mock.lastCall?.[0].participants[0]).toMatchObject({
        individualAccommodation: true,
        accommodationRequest: "Ground floor, please.",
      })
    })

    it("does not submit a note over 2,000 characters and shows the error under the field", async () => {
      const onSubmit = submitSpy()
      render(
        <ApplicationForm
          event={event}
          onSubmit={onSubmit}
        />,
      )
      await fillParticipant(1, anna)
      await userEvent.click(
        screen.getByRole("checkbox", { name: "I’d like individual accommodation" }),
      )
      fireEvent.change(note()!, { target: { value: "x".repeat(2001) } })
      await userEvent.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
      await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
      await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

      expect(
        await screen.findByText("The note can have at most 2,000 characters."),
      ).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
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

  it("restores a participant and submits both term selections", { timeout: 20_000 }, async () => {
    const onSubmit = submitSpy()
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByRole("button", { name: /Remove participant/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Add another participant" }))
    expect(screen.getByRole("button", { name: "Remove participant 1" })).toBeVisible()

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
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    const termsPerParticipant = onSubmit.mock.lastCall?.[0].participants.map(
      (participant) => participant.termIds,
    )
    expect(termsPerParticipant).toEqual([["t1"], ["t2"]])

    await userEvent.click(screen.getAllByRole("button", { name: "Edit details" })[0]!)
    await userEvent.click(screen.getByRole("button", { name: "Remove participant 1" }))
    expect(screen.getByRole("heading", { name: /Participant 1 · Matěj/ })).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Undo removal" }))
    expect(screen.getByRole("heading", { name: /Participant 1 · Anna/ })).toBeVisible()
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
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))

    expect(await screen.findByText("Enter a valid date of birth.")).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    const button = await screen.findByRole("button", { name: "Submitting…" })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
    expect(button.querySelector(".submit-mark")).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("Please wait for the confirmation.")
    await userEvent.click(button)
    expect(onSubmit).toHaveBeenCalledOnce()

    finish?.()
    const ready = await screen.findByRole("button", { name: "Submit application" })
    expect(ready).toBeEnabled()
    expect(ready.querySelector(".submit-mark")).toBeNull()
  })

  it("focuses the server message when a duplicate response identifies no submitted field", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={vi.fn().mockResolvedValue({ duplicate: null })}
        errorMessage="Anna is already registered for Week 2."
      />,
    )

    await fillParticipant(1, anna)
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "anna@example.com")
    await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Continue to review" }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus())
    expect(screen.getByRole("checkbox", { name: /Week 2/ })).not.toBeInvalid()
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
