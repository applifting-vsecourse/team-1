import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROUTES } from "@/app/routes"

import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"

const { signOut, navigate } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<{ error: null }>>(() => Promise.resolve({ error: null })),
  navigate: vi.fn(),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { signOut } }))
vi.mock("@/components/atoms/Logo", () => ({ Logo: () => null }))
vi.mock("@/components/molecules/PublicPreferences", () => ({ PublicPreferences: () => null }))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a
      href={to}
      {...props}
    >
      {children}
    </a>
  ),
}))

function renderLayout(isSignedIn?: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RegistrationLayout isSignedIn={isSignedIn}>content</RegistrationLayout>
    </QueryClientProvider>,
  )
}

describe("RegistrationLayout", () => {
  beforeEach(() => {
    signOut.mockClear()
    navigate.mockClear()
  })

  it("lets a signed-in organizer leave onboarding by signing out", async () => {
    renderLayout(true)

    expect(screen.queryByRole("link", { name: "Back to homepage" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: ROUTES.home, ignoreBlocker: true }),
    )
    expect(signOut).toHaveBeenCalledOnce()
  })

  it("keeps the back link and sign-in for a visitor who is not signed in", () => {
    renderLayout()

    expect(screen.getByRole("link", { name: "Back to homepage" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })
})
