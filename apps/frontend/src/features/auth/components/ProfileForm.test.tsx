import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"
import { notify } from "@/lib/notify"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import type * as ProfileApi from "@/features/auth/api/profile"
import { ProfileForm } from "@/features/auth/components/ProfileForm"

const { updateProfile, getSession } = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock("@/features/auth/api/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof ProfileApi>()),
  updateProfile,
}))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { getSession } }))

vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn() } }))

const user: SessionUser = {
  id: "u1",
  email: "eva.mala@example.cz",
  name: "Eva Malá",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
  locale: "cs",
}

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileForm user={user} />
    </QueryClientProvider>,
  )

describe("ProfileForm", () => {
  beforeEach(async () => {
    // jsdom lacks what Radix Select asks of the pointer.
    Object.assign(Element.prototype, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
      scrollIntoView: () => undefined,
    })
    updateProfile.mockReset()
    vi.mocked(notify.success).mockReset()
    getSession.mockReset()
    getSession.mockResolvedValue({ data: { user }, error: null })
    await i18n.changeLanguage("en")
  })

  it("shows the name (the e-mail has its own card, the language its own choice)", () => {
    renderForm()

    expect(screen.getByLabelText("Full name")).toHaveValue("Eva Malá")
    expect(screen.queryByRole("combobox", { name: "Language" })).not.toBeInTheDocument()
    expect(screen.queryByText("eva.mala@example.cz")).not.toBeInTheDocument()
  })

  it("confirms a saved name with a toast", async () => {
    updateProfile.mockResolvedValue({ name: "Eva Nová", locale: "cs" })
    renderForm()

    await userEvent.clear(screen.getByLabelText("Full name"))
    await userEvent.type(screen.getByLabelText("Full name"), "Eva Nová")
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(updateProfile).toHaveBeenCalledWith({ name: "Eva Nová", locale: "cs" })
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("New details saved"))
  })

  it("refuses an empty name and sends nothing", async () => {
    renderForm()

    await userEvent.clear(screen.getByLabelText("Full name"))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Some fields are not filled in correctly.")).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
    expect(notify.success).not.toHaveBeenCalled()
  })
})
