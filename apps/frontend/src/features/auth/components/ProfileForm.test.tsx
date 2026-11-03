import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

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
    getSession.mockReset()
    getSession.mockResolvedValue({ data: { user }, error: null })
    await i18n.changeLanguage("en")
  })

  it("shows the name, the saved language and the e-mail (read-only)", () => {
    renderForm()

    expect(screen.getByLabelText("Full name")).toHaveValue("Eva Malá")
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("Čeština")
    expect(screen.getByText("eva.mala@example.cz")).toBeInTheDocument()
  })

  it("saves the language, confirms it and switches the UI to it", async () => {
    updateProfile.mockResolvedValue({ name: "Eva Malá", locale: "en" })
    renderForm()

    await userEvent.click(screen.getByRole("combobox", { name: "Language" }))
    await userEvent.click(await screen.findByRole("option", { name: "English" }))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(updateProfile).toHaveBeenCalledWith({ name: "Eva Malá", locale: "en" })
    expect(await screen.findByText("Language saved.")).toBeInTheDocument()
    expect(screen.getByText("Application update e-mails will be sent in English.")).toBeVisible()
    expect(i18n.resolvedLanguage).toBe("en")
  })

  it("refuses an empty name and sends nothing", async () => {
    renderForm()

    await userEvent.clear(screen.getByLabelText("Full name"))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByText("Some fields are not filled in correctly.")).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })
})
