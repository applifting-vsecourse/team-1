import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import { SetPasswordForm } from "@/features/auth/components/SetPasswordForm"

const { setPassword, getSession, navigate } = vi.hoisted(() => ({
  setPassword: vi.fn(),
  getSession: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("@/features/auth/api/setPassword", () => ({ setPassword }))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { getSession } }))
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn() } }))

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SetPasswordForm email="petra@example.com" />
    </QueryClientProvider>,
  )

const fill = async (password: string) => {
  await userEvent.type(screen.getByLabelText("New password"), password)
  await userEvent.click(screen.getByRole("button", { name: "Set password" }))
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

  it("shows the e-mail of the application in a disabled field", () => {
    renderForm()

    const email = screen.getByRole("textbox", { name: "E-mail" })
    expect(email).toHaveValue("petra@example.com")
    expect(email).toBeDisabled()
  })

  it("ticks the rule „At least 8 characters“ off live", async () => {
    renderForm()
    const password = screen.getByLabelText("New password")

    expect(password).toHaveAccessibleDescription("At least 8 characters (not met)")
    await userEvent.type(password, "12345678")
    expect(password).toHaveAccessibleDescription("At least 8 characters (met)")
  })

  it("refuses a password shorter than 8 characters and sends nothing", async () => {
    renderForm()

    await fill("short")

    expect(
      await screen.findByText("The password must have at least 8 characters."),
    ).toBeInTheDocument()
    // The field keeps the rule and gains the error: both describe the input.
    expect(screen.getByLabelText("New password")).toHaveAccessibleDescription(
      "At least 8 characters (not met) The password must have at least 8 characters.",
    )
    expect(setPassword).not.toHaveBeenCalled()
  })

  it("blocks a second submit while sending", async () => {
    setPassword.mockReturnValue(new Promise(() => undefined))
    renderForm()

    await fill("my-own-password")

    await waitFor(() => expect(screen.getByRole("button", { name: /Set password/ })).toBeDisabled())
    expect(setPassword).toHaveBeenCalledTimes(1)
  })

  it("sets the password, reloads the session and opens the application", async () => {
    setPassword.mockResolvedValue(undefined)
    renderForm()

    await fill("my-own-password")

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/participant" }))
    expect(notify.success).toHaveBeenCalledWith("Your password is set.")
    expect(setPassword).toHaveBeenCalledWith("my-own-password")
    expect(getSession).toHaveBeenCalled()
  })

  it("shows one line and keeps the form when saving fails", async () => {
    setPassword.mockRejectedValue(new Error("Your password is already set."))
    renderForm()

    await fill("my-own-password")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The password couldn't be set. Please try again.",
    )
    expect(screen.getByLabelText("New password")).toHaveValue("my-own-password")
    expect(navigate).not.toHaveBeenCalled()
  })
})
