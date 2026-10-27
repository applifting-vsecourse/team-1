import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"
import { ForbiddenError } from "@/lib/errors"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { OrganizerAreaError } from "@/features/auth/components/OrganizerAreaError"

vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: {} }))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({}),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

const renderWith = (user: SessionUser | null, error: Error) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), user && { user })
  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizerAreaError error={error} />
    </QueryClientProvider>,
  )
}

const participant: SessionUser = {
  id: "u1",
  email: "ucastnik@example.com",
  name: "Petra",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
}

const organizer: SessionUser = {
  ...participant,
  email: "organizator@example.com",
  accountType: "ORGANIZER",
}

describe("OrganizerAreaError", () => {
  it("shows an organizer opening another organization's record the 403 page with a way back", () => {
    renderWith(organizer, new ForbiddenError())

    expect(
      screen.getByRole("heading", { name: "You don't have access to this page" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/The requested record isn't available to you/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "My events" })).toHaveAttribute(
      "href",
      "/organizer/events",
    )
    expect(screen.queryByRole("link", { name: "Back to dashboard" })).not.toBeInTheDocument()
  })

  it("shows a participant the 403 page with a way back, and nothing of the area", () => {
    renderWith(participant, new ForbiddenError())

    expect(
      screen.getByRole("heading", { name: "You don't have access to this page" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/A participant account can't manage events/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "My application" })).toHaveAttribute(
      "href",
      "/participant",
    )
    expect(
      screen.getByRole("button", { name: "Sign out and sign in with another account" }),
    ).toBeInTheDocument()
  })

  it("falls back to the generic error page for other errors", () => {
    renderWith(participant, new Error("boom"))

    expect(screen.queryByText(/participant account can't manage events/)).not.toBeInTheDocument()
  })
})
