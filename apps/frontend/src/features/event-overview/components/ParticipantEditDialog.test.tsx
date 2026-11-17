import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PaymentApplication } from "@/features/event-overview/api/payments"
import { ParticipantEditDialog } from "@/features/event-overview/components/ParticipantEditDialog"

const { put, success } = vi.hoisted(() => ({ put: vi.fn(), success: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { put } }))
vi.mock("@/lib/notify", () => ({ notify: { success } }))

const application: Parameters<typeof ParticipantEditDialog>[0]["application"] = {
  id: "a1",
  firstName: "Tomáš",
  lastName: "Nowak",
  birthDate: "2014-05-04",
  gender: "MALE",
  email: "rodice.novakovi@email.cz",
  phone: "+420777123456",
  individualAccommodation: false,
  accommodationRequest: null,
}

function setup(overrides: Partial<PaymentApplication> = {}) {
  const onClose = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  render(
    <QueryClientProvider client={client}>
      <ParticipantEditDialog
        application={{ ...application, ...overrides }}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { onClose, invalidate, user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  put.mockReturnValue(Promise.resolve({}))
})

describe("ParticipantEditDialog", () => {
  it("shows the current values, and gender and e-mail as text that can't be changed", () => {
    setup()
    const dialog = screen.getByRole("dialog", { name: "Edit participant details" })
    expect(within(dialog).getByLabelText("First name *")).toHaveValue("Tomáš")
    expect(within(dialog).getByLabelText("Last name *")).toHaveValue("Nowak")
    expect(within(dialog).getByLabelText("Phone *")).toHaveValue("+420777123456")
    expect(within(dialog).getByText("Gender (can't be changed)")).toBeVisible()
    expect(within(dialog).getByText("rodice.novakovi@email.cz")).toBeVisible()
    expect(within(dialog).queryByRole("textbox", { name: /e-mail/i })).not.toBeInTheDocument()
    expect(within(dialog).getByText(/The applicant will not get an e-mail/)).toBeVisible()
  })

  it("saves the changes, refreshes the detail, shows a toast and closes", async () => {
    const { user, onClose, invalidate } = setup()
    const lastName = screen.getByLabelText("Last name *")
    await user.clear(lastName)
    await user.type(lastName, "Novák")
    const phone = screen.getByLabelText("Phone *")
    await user.clear(phone)
    await user.type(phone, "+420 777 000 111")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(put).toHaveBeenCalledWith("organizer/applications/a1/details", {
      json: {
        firstName: "Tomáš",
        lastName: "Novák",
        birthDate: "2014-05-04",
        phone: "+420777000111",
        individualAccommodation: false,
        accommodationRequest: null,
      },
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["eventOverview"] })
    expect(success).toHaveBeenCalledWith("Participant details saved.")
  })

  it("shows the note only for an individual accommodation and sends it trimmed", async () => {
    const { user } = setup()
    expect(screen.queryByLabelText(/^Note/)).not.toBeInTheDocument()
    await user.click(screen.getByRole("checkbox", { name: "Individual accommodation" }))
    await user.type(screen.getByLabelText(/^Note/), "  Own room  ")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("organizer/applications/a1/details", {
        json: expect.objectContaining({
          individualAccommodation: true,
          accommodationRequest: "Own room",
        }) as unknown,
      }),
    )
  })

  it("shows errors under the fields and sends nothing", async () => {
    const { user } = setup()
    await user.clear(screen.getByLabelText("First name *"))
    await user.clear(screen.getByLabelText("Phone *"))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Enter the first name.")).toBeVisible()
    expect(screen.getByText("Enter the phone number.")).toBeVisible()
    expect(screen.getByLabelText("First name *")).toBeInvalid()
    expect(put).not.toHaveBeenCalled()
  })

  it("rejects a phone in the wrong format and a too long note", async () => {
    const { user } = setup({ individualAccommodation: true })
    const phone = screen.getByLabelText("Phone *")
    await user.clear(phone)
    await user.type(phone, "12345")
    await user.click(screen.getByLabelText(/^Note/))
    await user.paste("x".repeat(2001))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText(/Enter a valid phone number/)).toBeVisible()
    expect(screen.getByText("The note can be at most 2,000 characters long.")).toBeVisible()
    expect(put).not.toHaveBeenCalled()
  })

  it("keeps the dialog open and shows the server's error when saving fails", async () => {
    put.mockRejectedValue(new Error("This application can no longer be edited."))
    const { user, onClose } = setup()
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("The changes could not be saved")).toBeVisible()
    expect(screen.getByText("This application can no longer be edited.")).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Last name *")).toHaveValue("Nowak")
  })

  it("disables the buttons while saving", async () => {
    put.mockReturnValue(new Promise(() => undefined))
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
  })

  it("closes on Cancel without saving", async () => {
    const { user, onClose } = setup()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })
})
