import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm"

const authClient = vi.hoisted(() => ({ changePassword: vi.fn() }))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient }))

const router = vi.hoisted(() => ({
  history: { canGoBack: vi.fn(), back: vi.fn() },
  navigate: vi.fn(),
}))
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ history: router.history }),
  useNavigate: () => router.navigate,
}))
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn() } }))
vi.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({
    user: { id: "u1", accountType: "ORGANIZER", mustSetPassword: false } as SessionUser,
  }),
}))

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChangePasswordForm />
    </QueryClientProvider>,
  )

const fill = async (current: string, next: string) => {
  await userEvent.type(screen.getByLabelText("Current password *"), current)
  await userEvent.type(screen.getByLabelText("New password *"), next)
  await userEvent.click(screen.getByRole("button", { name: "Change password" }))
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    router.history.canGoBack.mockReset()
    router.history.back.mockReset()
    router.navigate.mockReset()
    vi.mocked(notify.success).mockReset()
    authClient.changePassword.mockReset()
    authClient.changePassword.mockResolvedValue({ data: {}, error: null })
  })

  it("sends the current and the new password and clears the fields", async () => {
    renderForm()

    await fill("old-password", "new-password-8")

    expect(authClient.changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password-8",
    })
    expect(await screen.findByLabelText("New password *")).toHaveValue("")
    expect(screen.getByLabelText("Current password *")).toHaveValue("")
    expect(notify.success).toHaveBeenCalledWith("New password saved")
  })

  it("refuses a new password shorter than 8 characters and sends nothing", async () => {
    renderForm()

    await fill("old-password", "short")

    // The hint turns into the error, so the text is on the page once.
    expect(
      await screen.findAllByText("The new password must be at least 8 characters."),
    ).toHaveLength(1)
    expect(authClient.changePassword).not.toHaveBeenCalled()
  })

  it("marks a wrong current password and keeps what was typed", async () => {
    authClient.changePassword.mockResolvedValue({
      data: null,
      error: { code: "INVALID_PASSWORD", message: "Invalid password", status: 400 },
    })
    renderForm()

    await fill("wrong", "new-password-8")

    expect(await screen.findByText("The current password is incorrect.")).toBeInTheDocument()
    expect(screen.getByLabelText("Current password *")).toHaveValue("wrong")
    expect(screen.getByLabelText("Current password *")).toBeInvalid()
  })

  it("shows and hides the typed password without losing it", async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText("Current password *"), "secret-1")

    const [toggle] = screen.getAllByRole("button", { name: "Show password" })
    await userEvent.click(toggle!)

    expect(screen.getByLabelText("Current password *")).toHaveAttribute("type", "text")
    expect(screen.getByLabelText("Current password *")).toHaveValue("secret-1")
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("goes back to the previous page on Back", async () => {
    router.history.canGoBack.mockReturnValue(true)
    renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(router.history.back).toHaveBeenCalled()
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it("goes to the area home on Back when there is no previous page", async () => {
    router.history.canGoBack.mockReturnValue(false)
    renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(router.history.back).not.toHaveBeenCalled()
    expect(router.navigate).toHaveBeenCalledWith({ to: "/organizer" })
  })
})
