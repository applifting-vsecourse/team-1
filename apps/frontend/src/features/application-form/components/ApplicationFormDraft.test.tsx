import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationForm } from "@/features/application-form/components/ApplicationForm"

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

const KEY = "togena:application-draft:abc"

const renderForm = (props: { draftKey?: string; isDone?: boolean } = { draftKey: "abc" }) =>
  render(
    <ApplicationForm
      event={event}
      onSubmit={vi.fn()}
      {...props}
    />,
  )

const participantCard = (number: number) => {
  const heading = screen.getByRole("heading", { name: new RegExp(`^Participant ${number}`) })
  const card = heading.closest<HTMLElement>("[data-slot=card]")
  if (!card) throw new Error(`No card around participant ${number}`)
  return card
}

async function fillWholeForm() {
  const first = within(participantCard(1))
  await userEvent.type(first.getByLabelText("First name *"), "Anna")
  await userEvent.type(first.getByLabelText("Last name *"), "Nováková")
  await userEvent.type(first.getByLabelText("Date of birth *"), "17/05/2010")
  await userEvent.click(first.getByRole("combobox", { name: "Gender for room allocation *" }))
  await userEvent.click(await screen.findByRole("option", { name: "Woman" }))
  await userEvent.click(first.getByRole("checkbox", { name: /11–17 Jul/ }))

  await userEvent.click(screen.getByRole("button", { name: "Add another participant" }))
  const second = within(participantCard(2))
  await userEvent.type(second.getByLabelText("First name *"), "Petr")
  await userEvent.click(second.getByRole("checkbox", { name: /4–10 Jul/ }))

  await userEvent.type(screen.getByLabelText("Contact e-mail *"), "rodic@example.com")
  await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the processing/ }))
}

describe("ApplicationForm draft in sessionStorage", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it("restores the whole form after a reload, with every participant and term", async () => {
    const { unmount } = renderForm()
    await fillWholeForm()
    unmount()

    renderForm()

    const first = within(participantCard(1))
    expect(first.getByLabelText("First name *")).toHaveValue("Anna")
    expect(first.getByLabelText("Last name *")).toHaveValue("Nováková")
    expect(first.getByLabelText("Date of birth *")).toHaveValue("17/05/2010")
    expect(first.getByRole("combobox", { name: "Gender for room allocation *" })).toHaveTextContent(
      "Woman",
    )
    expect(first.getByRole("checkbox", { name: /11–17 Jul/ })).toBeChecked()
    expect(first.getByRole("checkbox", { name: /4–10 Jul/ })).not.toBeChecked()
    const second = within(participantCard(2))
    expect(second.getByLabelText("First name *")).toHaveValue("Petr")
    expect(second.getByRole("checkbox", { name: /4–10 Jul/ })).toBeChecked()
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("rodic@example.com")
  })

  it("never restores the consent as checked and never stores it", async () => {
    const { unmount } = renderForm()
    await fillWholeForm()
    expect(screen.getByRole("checkbox", { name: /I agree to the processing/ })).toBeChecked()
    expect(window.sessionStorage.getItem(KEY)).not.toContain("consent")
    unmount()

    renderForm()

    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("rodic@example.com")
    expect(screen.getByRole("checkbox", { name: /I agree to the processing/ })).not.toBeChecked()
  })

  it("keeps the forms of different application links apart", async () => {
    const { unmount } = renderForm({ draftKey: "abc" })
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "rodic@example.com")
    unmount()

    renderForm({ draftKey: "other" })

    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("")
  })

  it("ignores a damaged saved draft and drops terms the event no longer offers", () => {
    window.sessionStorage.setItem(KEY, "{not json")
    const { unmount } = renderForm()
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("")
    unmount()

    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({
        email: "",
        participants: [{ firstName: "Anna", lastName: "", birthDate: "", termIds: ["t2", "gone"] }],
      }),
    )
    renderForm()
    expect(screen.getByRole("checkbox", { name: /11–17 Jul/ })).toBeChecked()
  })

  it("asks before clearing, then empties the form and the saved draft", async () => {
    renderForm()
    await fillWholeForm()
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    const dialog = await screen.findByRole("dialog", { name: "Clear the form?" })

    // Keeping it changes nothing.
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep it" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("rodic@example.com")
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Clear the form" }),
    )

    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("")
    expect(screen.getByLabelText("First name *")).toHaveValue("")
    expect(screen.queryByRole("heading", { name: /^Participant 2/ })).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it("keeps the clear button away from the submit button", () => {
    renderForm()

    const clear = screen.getByRole("button", { name: "Clear" })
    const submit = screen.getByRole("button", { name: "Submit application" })
    expect(clear.closest("[data-slot=card]")).toBeNull()
    expect(submit.closest("[data-slot=card]")).not.toBeNull()
  })

  it("removes the saved draft after a successful submission", async () => {
    const { rerender } = renderForm()
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "rodic@example.com")
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull()

    rerender(
      <ApplicationForm
        event={event}
        draftKey="abc"
        isDone
        onSubmit={vi.fn()}
      />,
    )

    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it("works when sessionStorage throws, as in a private window", async () => {
    const blocked = () => {
      throw new DOMException("denied", "SecurityError")
    }
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked)
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked)
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(blocked)

    renderForm()
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "rodic@example.com")
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("rodic@example.com")

    await userEvent.click(screen.getByRole("button", { name: "Clear" }))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Clear the form" }),
    )
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("")
    vi.restoreAllMocks()
  })
})
