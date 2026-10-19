import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationForm } from "@/features/application-form/components/ApplicationForm"
import { TermsList } from "@/features/application-form/components/TermsList"
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

// Radix's radio group measures its items; jsdom has no ResizeObserver.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

const submitSpy = () => vi.fn<(values: ApplicationFormValues) => void | Promise<unknown>>()

const participantCard = (number: number) => {
  const heading = screen.getByRole("heading", { name: `Participant ${number}` })
  const card = heading.closest<HTMLElement>("[data-slot=card]")
  if (!card) throw new Error(`No card around participant ${number}`)
  return card
}

async function fillParticipant(
  number: number,
  data: { first: string; last: string; birth: string; term: string },
) {
  const card = within(participantCard(number))
  await userEvent.type(card.getByLabelText("First name"), data.first)
  await userEvent.type(card.getByLabelText("Last name"), data.last)
  await userEvent.type(card.getByLabelText("Date of birth"), data.birth)
  await userEvent.click(card.getByRole("radio", { name: "Woman" }))
  await userEvent.click(card.getByRole("checkbox", { name: new RegExp(data.term) }))
}

describe("TermsList", () => {
  it("shows every term with its dates and price", () => {
    render(<TermsList terms={event.terms} />)

    expect(screen.getByText("Week 1")).toBeInTheDocument()
    expect(screen.getByText("Week 2")).toBeInTheDocument()
    expect(screen.getByText(/4,500/)).toBeInTheDocument()
    expect(screen.getByText(/4,900/)).toBeInTheDocument()
  })
})

describe("ApplicationForm", () => {
  it("shows an error at every empty required field and does not submit", async () => {
    const onSubmit = submitSpy()
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    expect(await screen.findAllByText("This field is required.")).toHaveLength(4)
    expect(screen.getByText("Choose one.")).toBeInTheDocument()
    expect(screen.getByText("Choose at least one term.")).toBeInTheDocument()
    expect(screen.getByText("Consent is required to submit the application.")).toBeInTheDocument()
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

    await userEvent.type(screen.getByLabelText("E-mail"), "anna@example.com")
    await fillParticipant(1, {
      first: "Anna",
      last: "Nováková",
      birth: "2010-05-17",
      term: "Week 2",
    })
    await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    expect(onSubmit).toHaveBeenCalledOnce()
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

  it("adds and removes participants, each with their own terms", async () => {
    const onSubmit = submitSpy()
    render(
      <ApplicationForm
        event={event}
        onSubmit={onSubmit}
      />,
    )

    // The only participant can't be removed.
    expect(screen.queryByRole("button", { name: /Remove participant/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Add participant" }))
    expect(participantCard(2)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("E-mail"), "anna@example.com")
    await fillParticipant(1, {
      first: "Anna",
      last: "Nováková",
      birth: "2010-05-17",
      term: "Week 1",
    })
    await fillParticipant(2, {
      first: "Eva",
      last: "Nováková",
      birth: "2012-01-02",
      term: "Week 2",
    })
    await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    const termsPerParticipant = onSubmit.mock.lastCall?.[0].participants.map(
      (participant) => participant.termIds,
    )
    expect(termsPerParticipant).toEqual([["t1"], ["t2"]])

    await userEvent.click(screen.getByRole("button", { name: "Remove participant 2" }))
    expect(screen.queryByRole("heading", { name: "Participant 2" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Remove participant/ })).not.toBeInTheDocument()
  })

  it("rejects a date of birth in the future", async () => {
    render(
      <ApplicationForm
        event={event}
        onSubmit={submitSpy()}
      />,
    )

    await userEvent.type(screen.getByLabelText("Date of birth"), "2999-01-01")
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    expect(await screen.findByText("The date of birth can't be in the future.")).toBeInTheDocument()
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

    await userEvent.type(screen.getByLabelText("E-mail"), "anna@example.com")
    await fillParticipant(1, {
      first: "Anna",
      last: "Nováková",
      birth: "2010-05-17",
      term: "Week 1",
    })
    await userEvent.click(screen.getByRole("checkbox", { name: /agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    const button = await screen.findByRole("button", { name: "Submitting…" })
    expect(button).toBeDisabled()
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
