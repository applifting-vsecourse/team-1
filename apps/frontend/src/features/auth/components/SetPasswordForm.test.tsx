import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm"

const { setPassword, getSession, navigate } = vi.hoisted(() => ({
  setPassword: vi.fn(),
  getSession: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("@/features/auth/api/setPassword", () => ({ setPassword }))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { getSession } }))
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SetPasswordForm email="petra@example.com" />
    </QueryClientProvider>,
  )

const fill = async (password: string, repeat: string) => {
  await userEvent.type(screen.getByLabelText("New password"), password)
  await userEvent.type(screen.getByLabelText("Repeat new password"), repeat)
  await userEvent.click(screen.getByRole("button", { name: "Set password and open application" }))
}

describe("SetPasswordForm", () => {
  beforeEach(() => {
    setPassword.mockReset()
    getSession.mockReset()
    navigate.mockReset()
    getSession.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "petra@example.com",
          name: "Petra",
          accountType: "PARTICIPANT",
          mustSetPassword: false,
        },
      },
      error: null,
    })
  })

  it("shows the e-mail of the application, read-only", () => {
    renderForm()

    expect(screen.getByLabelText("E-mail")).toHaveValue("petra@example.com")
    expect(screen.getByLabelText("E-mail")).toBeDisabled()
  })

  it("refuses a password shorter than 8 characters and sends nothing", async () => {
    renderForm()

    await fill("short", "short")

    expect(
      await screen.findByText("The password must have at least 8 characters."),
    ).toBeInTheDocument()
    expect(setPassword).not.toHaveBeenCalled()
  })

  it("refuses passwords that don't match and sends nothing", async () => {
    renderForm()

    await fill("my-own-password", "my-own-passwor")

    expect(
      await screen.findByText("The passwords don't match. Enter the same new password."),
    ).toBeInTheDocument()
    expect(setPassword).not.toHaveBeenCalled()
  })

  it("blocks a second submit while sending", async () => {
    setPassword.mockReturnValue(new Promise(() => undefined))
    renderForm()

    await fill("my-own-password", "my-own-password")

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Set password and open application" }),
      ).toBeDisabled(),
    )
    expect(setPassword).toHaveBeenCalledTimes(1)
  })

  it("sets the password, reloads the session and opens the application", async () => {
    setPassword.mockResolvedValue(undefined)
    renderForm()

    await fill("my-own-password", "my-own-password")

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/participant" }))
    expect(setPassword).toHaveBeenCalledWith("my-own-password")
    expect(getSession).toHaveBeenCalled()
  })

  it("shows the server's error and keeps the form when saving fails", async () => {
    setPassword.mockRejectedValue(new Error("Your password is already set."))
    renderForm()

    await fill("my-own-password", "my-own-password")

    expect(await screen.findByText("Couldn't set the password")).toBeInTheDocument()
    expect(screen.getByText("Your password is already set.")).toBeInTheDocument()
    expect(screen.getByLabelText("New password")).toHaveValue("my-own-password")
    expect(navigate).not.toHaveBeenCalled()
  })
})
