import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { SidebarAccount } from "@/features/auth/components/SidebarAccount"

const { signOut } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<{ error: null }>>(() => Promise.resolve({ error: null })),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signOut },
}))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  // Radix passes the menu item role and handlers down to the link.
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a
      href={to}
      {...props}
    >
      {children}
    </a>
  ),
}))

const user: SessionUser = {
  id: "u1",
  email: "eva.mala@example.cz",
  name: "Eva Malá",
  accountType: "ORGANIZER",
  mustSetPassword: false,
}

function renderAccount(sessionUser: SessionUser = user) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), { user: sessionUser })
  render(
    <QueryClientProvider client={queryClient}>
      <SidebarAccount />
    </QueryClientProvider>,
  )
}

describe("SidebarAccount", () => {
  it("shows the initials, name and e-mail", () => {
    renderAccount()

    expect(screen.getByText("EM")).toBeInTheDocument()
    expect(screen.getByText("Eva Malá")).toBeInTheDocument()
    expect(screen.getByText("eva.mala@example.cz")).toBeInTheDocument()
  })

  it("opens a menu with the account settings and sign-out only", async () => {
    renderAccount()
    await userEvent.click(screen.getByRole("button", { name: /Eva Malá/ }))

    expect(await screen.findByRole("menuitem", { name: "Account settings" })).toHaveAttribute(
      "href",
      "/organizer/account",
    )
    expect(screen.getAllByRole("menuitem")).toHaveLength(2)
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(signOut).toHaveBeenCalled()
  })

  it("links a participant to the participant account page", async () => {
    renderAccount({ ...user, accountType: "PARTICIPANT" })
    await userEvent.click(screen.getByRole("button", { name: /Eva Malá/ }))

    expect(await screen.findByRole("menuitem", { name: "Account settings" })).toHaveAttribute(
      "href",
      "/participant/account",
    )
  })
})
