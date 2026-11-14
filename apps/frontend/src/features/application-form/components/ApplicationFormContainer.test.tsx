import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { ApplicationFormContainer } from "@/features/application-form/components/ApplicationFormContainer"

const { submitApplication, navigate } = vi.hoisted(() => ({
  submitApplication: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("@/features/application-form/api/submitApplication", () => ({ submitApplication }))
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

const event: PublicEvent = {
  name: "Summer camp 2027",
  description: null,
  location: null,
  terms: [
    { id: "t1", name: "Week 1", startsOn: "2027-07-04", endsOn: "2027-07-10", priceCzk: 4500 },
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

// Filling in the whole form takes a while on a busy machine.
vi.setConfig({ testTimeout: 20_000 })

const keyOf = (token: string) => `togena:application-draft:${token}`

const renderContainer = (token: string, client = new QueryClient()) => {
  const ui = (currentToken: string) => (
    <QueryClientProvider client={client}>
      <ApplicationFormContainer
        token={currentToken}
        event={event}
      />
    </QueryClientProvider>
  )
  const view = render(ui(token))
  return { ...view, goTo: (next: string) => view.rerender(ui(next)) }
}

describe("ApplicationFormContainer", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    submitApplication.mockReset()
    navigate.mockReset()
  })

  it("keeps the drafts of two application links apart when the page changes without unmounting", async () => {
    window.sessionStorage.setItem(
      keyOf("b"),
      JSON.stringify({
        email: "b@example.com",
        participants: [{ firstName: "Bára", lastName: "", birthDate: "", termIds: [] }],
      }),
    )
    const { goTo } = renderContainer("a")
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "a@example.com")
    await userEvent.type(screen.getByLabelText("First name *"), "Adam")

    goTo("b")

    // The second link shows its own draft, not what was typed for the first.
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("b@example.com")
    expect(screen.getByLabelText("First name *")).toHaveValue("Bára")
    const savedA = JSON.parse(window.sessionStorage.getItem(keyOf("a")) ?? "{}") as {
      email: string
    }
    const savedB = JSON.parse(window.sessionStorage.getItem(keyOf("b")) ?? "{}") as {
      email: string
    }
    expect(savedA.email).toBe("a@example.com")
    expect(savedB.email).toBe("b@example.com")

    // And back again: the first draft is still there.
    goTo("a")
    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("a@example.com")
    expect(screen.getByLabelText("First name *")).toHaveValue("Adam")
  })

  it("removes the saved draft right after the submission succeeded, before moving on", async () => {
    let draftWhenNavigating: string | null | undefined
    navigate.mockImplementation(() => {
      draftWhenNavigating = window.sessionStorage.getItem(keyOf("a"))
      view.unmount()
      return Promise.resolve()
    })
    submitApplication.mockResolvedValue({ accessToken: "secret" })
    const view = renderContainer("a")

    const card = within(
      screen
        .getByRole("heading", { name: /^Participant 1/ })
        .closest<HTMLElement>("[data-slot=card]")!,
    )
    await userEvent.type(card.getByLabelText("First name *"), "Anna")
    await userEvent.type(card.getByLabelText("Last name *"), "Nováková")
    await userEvent.type(card.getByLabelText("Date of birth *"), "17/05/2010")
    await userEvent.click(card.getByRole("combobox", { name: "Gender for room allocation *" }))
    await userEvent.click(await screen.findByRole("option", { name: "Woman" }))
    await userEvent.click(card.getByRole("checkbox", { name: /4–10 Jul/ }))
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "rodic@example.com")
    await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the processing/ }))
    expect(window.sessionStorage.getItem(keyOf("a"))).not.toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(submitApplication).toHaveBeenCalledTimes(1)
    // Already gone at the moment of navigating, not only after a later re-render.
    expect(draftWhenNavigating).toBeNull()
    expect(window.sessionStorage.getItem(keyOf("a"))).toBeNull()
  })

  it("keeps the draft when the submission fails", async () => {
    submitApplication.mockRejectedValue(new Error("boom"))
    const savedDraft = JSON.stringify({
      email: "rodic@example.com",
      participants: [
        {
          firstName: "Anna",
          lastName: "Nováková",
          birthDate: "2010-05-17",
          gender: "FEMALE",
          termIds: ["t1"],
        },
      ],
    })
    window.sessionStorage.setItem(keyOf("a"), savedDraft)
    renderContainer("a")
    await userEvent.click(screen.getByRole("checkbox", { name: /I agree to the processing/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit application" }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("boom"))
    expect(submitApplication).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(keyOf("a"))).toBe(savedDraft)
    expect(navigate).not.toHaveBeenCalled()
  })

  it("opens an empty form on a link without a draft and preserves the previous link's entries", async () => {
    const { goTo } = renderContainer("a")
    await userEvent.type(screen.getByLabelText("Contact e-mail *"), "a@example.com")
    await userEvent.type(screen.getByLabelText("First name *"), "Adam")
    const savedA = window.sessionStorage.getItem(keyOf("a"))

    goTo("b")

    expect(screen.getByLabelText("Contact e-mail *")).toHaveValue("")
    expect(screen.getByLabelText("First name *")).toHaveValue("")
    expect(window.sessionStorage.getItem(keyOf("b"))).toBeNull()
    expect(window.sessionStorage.getItem(keyOf("a"))).toBe(savedA)
  })
})
