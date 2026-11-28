import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { AccountPage } from "@/features/auth/components/AccountPage"

const user: SessionUser = {
  id: "u1",
  email: "jana.novakova@example.cz",
  name: "Jana Nováková",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
  locale: "en",
}

vi.mock("@/hooks/useConnectionFeedback", () => ({ useConnectionFeedback: () => undefined }))
vi.mock("@/features/auth/hooks/useEmailChangedNotice", () => ({
  useEmailChangedNotice: () => undefined,
}))
vi.mock("@/features/auth/hooks/useSession", () => ({ useSession: () => ({ user }) }))
// The forms and the other sections have their own tests; here only opening and closing matters.
vi.mock("@/features/auth/components/ProfileForm", () => ({
  ProfileForm: ({ onClose }: { onClose?: () => void }) => (
    <>
      <input aria-label="Full name" />
      <button
        type="button"
        onClick={onClose}
      >
        Close name
      </button>
    </>
  ),
}))
vi.mock("@/features/auth/components/ChangePasswordForm", () => ({
  ChangePasswordForm: ({ onClose }: { onClose?: () => void }) => (
    <>
      <input aria-label="Current password" />
      <button
        type="button"
        onClick={onClose}
      >
        Close password
      </button>
    </>
  ),
}))
vi.mock("@/features/auth/components/ChangeEmailSection", () => ({ ChangeEmailSection: () => null }))
vi.mock("@/features/auth/components/PreferencesCard", () => ({ PreferencesCard: () => null }))

describe("AccountPage", () => {
  it("lists the settings as rows: the name with its value, the password without one", () => {
    render(<AccountPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Account settings" })).toBeVisible()
    expect(screen.getByRole("region", { name: "Profile" })).toHaveTextContent("Jana Nováková")
    expect(screen.getByRole("button", { name: "Edit full name" })).toHaveTextContent("Edit")
    expect(screen.getByRole("button", { name: "Change password" })).toBeVisible()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("opens the name inline with the focus in the field and returns it to the button", async () => {
    render(<AccountPage />)

    await userEvent.click(screen.getByRole("button", { name: "Edit full name" }))
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveFocus()
    expect(screen.queryByRole("button", { name: "Edit full name" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Close name" }))
    expect(screen.queryByRole("textbox", { name: "Full name" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit full name" })).toHaveFocus()
  })

  it("opens one form at a time", async () => {
    render(<AccountPage />)

    await userEvent.click(screen.getByRole("button", { name: "Edit full name" }))
    await userEvent.click(screen.getByRole("button", { name: "Change password" }))

    expect(screen.getByRole("textbox", { name: "Current password" })).toHaveFocus()
    expect(screen.queryByRole("textbox", { name: "Full name" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Close password" }))
    expect(screen.getByRole("button", { name: "Change password" })).toHaveFocus()
  })
})
