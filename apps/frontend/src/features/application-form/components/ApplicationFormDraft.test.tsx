import { render, screen, waitFor, within } from "@testing-library/react"
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
  await userEvent.click(first.getByRole("combobox", { name: "Gender *" }))
  await userEvent.click(await screen.findByRole("option", { name: "Woman" }))
  await userEvent.click(first.getByRole("checkbox", { name: /11–17 Jul/ }))

  await userEvent.click(screen.getByRole("button", { name: "Add another participant" }))
  const second = within(participantCard(2))
  await userEvent.type(second.getByLabelText("First name *"), "Petr")
  await userEvent.click(second.getByRole("checkbox", { name: /4–10 Jul/ }))

  await userEvent.type(screen.getByLabelText("Contact e-mail *"), "rodic@example.com")
  await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the processing/ }))
}

// Filling in the whole form takes a while on a busy machine.
vi.setConfig({ testTimeout: 20_000 })

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
    expect(first.getByRole("combobox", { name: "Gender *" })).toHaveTextContent("Woman")
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

  it("says the draft is saved once something is typed, near the steps", async () => {
    renderForm()
    expect(screen.queryByText("Draft saved")).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "r")
    expect(screen.getByText("Draft saved")).toBeVisible()
    // A polite live region that exists from the start, so screen readers hear the first save.
    expect(screen.getByText("Draft saved").closest("[role=status]")).toBeInTheDocument()
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull()

    await userEvent.clear(screen.getByLabelText("Contact e-mail *"))
    expect(screen.queryByText("Draft saved")).not.toBeInTheDocument()
  })

  it("claims no saved draft without an application link", async () => {
    renderForm({})
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "rodic@example.com")

    expect(screen.queryByText("Draft saved")).not.toBeInTheDocument()
  })

  it("offers starting over only once something is filled in", async () => {
    renderForm()
    expect(screen.queryByRole("button", { name: "Start over" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: /4–10 Jul/ }))
    expect(screen.getByRole("button", { name: "Start over" })).toBeVisible()
  })

  it("asks before starting over, then empties the form and the saved draft without a toast", async () => {
    renderForm()
    await fillWholeForm()
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Start over" }))
    const dialog = await screen.findByRole("dialog", { name: "Start over?" })
    expect(dialog).toHaveAccessibleDescription(
      "All participants and selected terms will be deleted. This can't be undone.",
    )

    // Keeping it changes nothing.
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep it" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("rodic@example.com")
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Start over" }))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Start over" }),
    )

    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("")
    expect(screen.getByLabelText("First name *")).toHaveValue("")
    expect(screen.queryByRole("heading", { name: /^Participant 2/ })).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(screen.queryByText("Draft saved")).not.toBeInTheDocument()
    // No toast: the only live region left is the empty draft status.
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
    // The button that opened the dialog is gone; focus lands on the form heading, not the page.
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus())
  })

  it("keeps the start-over button away from the submit button", async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "r")

    const clear = screen.getByRole("button", { name: "Start over" })
    const submit = screen.getByRole("button", { name: "Continue to review" })
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

    // Nothing is kept, so nothing claims to be.
    expect(screen.queryByText("Draft saved")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Start over" }))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Start over" }),
    )
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("")
    vi.restoreAllMocks()
  })
})
