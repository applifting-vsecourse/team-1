import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrganizerRegistration } from "@/features/auth/components/OrganizerRegistration"
import { VerifyOrganizerEmail } from "@/features/auth/components/VerifyOrganizerEmail"

const { signUp, resend, navigate } = vi.hoisted(() => ({
  signUp: vi.fn(),
  resend: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signUp: { email: signUp }, sendVerificationEmail: resend },
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigate,
}))
vi.mock("@/features/auth/components/RegistrationLayout", () => ({
  RegistrationLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe("organizer registration", () => {
  beforeEach(() => {
    signUp.mockReset()
    resend.mockReset()
    navigate.mockReset()
  })

  it("keeps invalid e-mail and short password on the form", async () => {
    render(<OrganizerRegistration />)
    await userEvent.type(screen.getByLabelText("E-mail *"), "bad")
    await userEvent.type(screen.getByLabelText("Password *"), "short")
    await userEvent.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      screen.getByRole("heading", { name: "Check your registration details" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Enter a valid e-mail.")).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it("blocks submit when the repeated password differs", async () => {
    render(<OrganizerRegistration />)
    await userEvent.type(screen.getByLabelText("E-mail *"), "new@example.com")
    await userEvent.type(screen.getByLabelText("Password *"), "password123")
    await userEvent.type(screen.getByLabelText("Repeat password *"), "password124")
    await userEvent.click(screen.getByRole("button", { name: "Create account" }))

    expect(screen.getByText("The passwords do not match.")).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it("sends a verification link and opens the instructions", async () => {
    signUp.mockResolvedValue({ error: null })
    render(<OrganizerRegistration />)
    await userEvent.type(screen.getByLabelText("E-mail *"), "new@example.com")
    await userEvent.type(screen.getByLabelText("Password *"), "password123")
    await userEvent.type(screen.getByLabelText("Repeat password *"), "password123")
    await userEvent.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/organizer/verify-email",
        search: { email: "new@example.com" },
      }),
    )
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", password: "password123" }),
      expect.objectContaining({ headers: { "Accept-Language": "en" } }),
    )
  })

  it("requests a new link when the verification link has expired", async () => {
    resend.mockResolvedValue({ error: null })
    render(
      <VerifyOrganizerEmail
        email="new@example.com"
        error="TOKEN_EXPIRED"
      />,
    )
    expect(
      screen.getByRole("heading", { name: "The verification link has expired" }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Send a new verification link" }))
    await waitFor(() =>
      expect(resend).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" })),
    )
  })
})
