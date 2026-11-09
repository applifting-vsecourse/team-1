import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render as rtlRender, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrganizerRegistration } from "@/features/auth/components/OrganizerRegistration"
import { VerifyOrganizerEmail } from "@/features/auth/components/VerifyOrganizerEmail"

const { signUp, resend, navigate, authFetch, location } = vi.hoisted(() => ({
  authFetch: vi.fn(),
  location: { state: {} },
  signUp: vi.fn(),
  resend: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signUp: { email: signUp }, sendVerificationEmail: resend, $fetch: authFetch },
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigate,
  useLocation: ({ select }: { select: (value: { state: unknown }) => unknown }) => select(location),
}))
vi.mock("@/features/auth/components/RegistrationLayout", () => ({
  RegistrationLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const render = (ui: React.ReactElement) =>
  rtlRender(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  )

describe("organizer registration", () => {
  beforeEach(() => {
    signUp.mockReset()
    resend.mockReset()
    navigate.mockReset()
    authFetch.mockReset()
    location.state = {}
    authFetch.mockResolvedValue({ data: { enabled: false }, error: null })
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

  it("sends a verification link and opens the instructions", async () => {
    signUp.mockResolvedValue({ error: null })
    render(<OrganizerRegistration />)
    await userEvent.type(screen.getByLabelText("E-mail *"), "new@example.com")
    await userEvent.type(screen.getByLabelText("Password *"), "password123")
    await userEvent.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/organizer/verify-email",
        search: { email: "new@example.com" },
        state: { password: "password123" },
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

  it("hides the verify-without-e-mail button when the bypass is off", async () => {
    render(<VerifyOrganizerEmail email="new@example.com" />)
    await waitFor(() => expect(authFetch).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: "Verify without e-mail" })).not.toBeInTheDocument()
  })

  it("hides the button when the registration password is not available", async () => {
    authFetch.mockResolvedValue({ data: { enabled: true }, error: null })
    render(<VerifyOrganizerEmail email="new@example.com" />)
    await waitFor(() => expect(authFetch).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: "Verify without e-mail" })).not.toBeInTheDocument()
  })

  it("verifies without the e-mail link when the bypass is on", async () => {
    location.state = { password: "password123" }
    authFetch.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/status")
          ? { data: { enabled: true }, error: null }
          : { data: { status: true }, error: null },
      ),
    )
    render(<VerifyOrganizerEmail email="new@example.com" />)
    await userEvent.click(await screen.findByRole("button", { name: "Verify without e-mail" }))

    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith(
        "/email-verification-bypass",
        expect.objectContaining({
          method: "POST",
          body: { email: "new@example.com", password: "password123" },
        }),
      ),
    )
  })
})
