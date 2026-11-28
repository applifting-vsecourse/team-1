import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROUTES } from "@/app/routes"

import { RegistrationLayout } from "@/features/auth/components/RegistrationLayout"

const { signOut, navigate } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<{ error: null }>>(() => Promise.resolve({ error: null })),
  navigate: vi.fn(),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { signOut } }))
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

function renderLayout(props: Partial<Parameters<typeof RegistrationLayout>[0]> = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RegistrationLayout {...props}>content</RegistrationLayout>
    </QueryClientProvider>,
  )
}

describe("RegistrationLayout", () => {
  beforeEach(() => {
    signOut.mockClear()
    navigate.mockClear()
  })

  it("lets a signed-in organizer leave onboarding by signing out in the header", async () => {
    renderLayout({ isSignedIn: true, step: "organizationStep" })
    const header = screen.getByRole("banner")

    expect(within(header).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument()
    await userEvent.click(within(header).getByRole("button", { name: "Sign out" }))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: ROUTES.home, ignoreBlocker: true }),
    )
    expect(signOut).toHaveBeenCalledOnce()
  })

  it("shows the step as three dots instead of a stepper", () => {
    renderLayout({ step: "profileStep" })

    expect(screen.getByRole("img", { name: "Step 3 of 3" })).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("has no dots on the final step and no Sign out for a visitor", () => {
    renderLayout({ step: null })

    expect(screen.queryByRole("img", { name: /Step/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })
})
