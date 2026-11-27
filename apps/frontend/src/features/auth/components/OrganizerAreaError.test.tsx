import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"
import { ForbiddenError } from "@/lib/errors"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { OrganizerAreaError } from "@/features/auth/components/OrganizerAreaError"

const { signOut, navigate } = vi.hoisted(() => ({ signOut: vi.fn(), navigate: vi.fn() }))

vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { signOut } }))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
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
  locale: "en",
}

const organizer: SessionUser = {
  ...participant,
  email: "organizator@example.com",
  accountType: "ORGANIZER",
}

describe("OrganizerAreaError", () => {
  it("shows an organizer opening another organization's record the 403 page: a heading and the way to the events", () => {
    renderWith(organizer, new ForbiddenError())

    expect(
      screen.getByRole("heading", { level: 1, name: "You don't have access to this content" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to events" })).toHaveAttribute(
      "href",
      "/organizer/events",
    )
    expect(screen.queryByText("403")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign in with another account" })).toBeNull()
  })

  it("shows a participant the 403 page with the way to the applications, and nothing of the area", () => {
    renderWith(participant, new ForbiddenError())

    expect(
      screen.getByRole("heading", { level: 1, name: "You don't have access to this content" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "My applications" })).toHaveAttribute(
      "href",
      "/participant",
    )
    expect(screen.queryByText("403")).not.toBeInTheDocument()
  })

  it("lets a participant sign in with another account: signs out, then the sign-in", async () => {
    signOut.mockResolvedValue({ error: null })
    renderWith(participant, new ForbiddenError())

    await userEvent.click(screen.getByRole("button", { name: "Sign in with another account" }))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/participant/login", ignoreBlocker: true }),
    )
    expect(signOut).toHaveBeenCalledOnce()
  })

  it("falls back to the generic error page for other errors", () => {
    renderWith(participant, new Error("boom"))

    expect(
      screen.queryByRole("heading", { name: "You don't have access to this content" }),
    ).not.toBeInTheDocument()
  })
})
