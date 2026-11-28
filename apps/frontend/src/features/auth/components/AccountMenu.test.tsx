import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Calendar, LayoutGrid, Users } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { AccountMenu } from "@/features/auth/components/AccountMenu"

const { signOut } = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<{ error: null }>>(() => Promise.resolve({ error: null })),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signOut },
}))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  // Radix passes the menu item role and handlers down to the link.
  Link: ({
    children,
    to,
    activeOptions: _activeOptions,
    ...props
  }: {
    children: React.ReactNode
    to: string
    activeOptions?: unknown
  }) => (
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
  email: "jana.novakova@example.cz",
  name: "Jana Nováková",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
  locale: "en",
}

function renderMenu(account: SessionUser = user) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), { user: account })
  render(
    <QueryClientProvider client={queryClient}>
      <AccountMenu
        items={
          account.accountType === "ORGANIZER"
            ? [{ to: "/organizer/events", label: "Events", icon: Calendar }]
            : [
                { to: "/participant", label: "My applications", icon: Users },
                { to: "/catalog", label: "Event catalog", icon: LayoutGrid },
              ]
        }
      />
    </QueryClientProvider>,
  )
}

describe("AccountMenu", () => {
  it("is the avatar with the initials, named after the account", () => {
    renderMenu()

    const trigger = screen.getByRole("button", {
      name: "Account menu, Jana Nováková, jana.novakova@example.cz",
    })
    expect(trigger).toHaveTextContent("JN")
  })

  it("holds the navigation, the account settings and sign-out", async () => {
    renderMenu()
    await userEvent.click(screen.getByRole("button", { name: /Account menu/ }))

    const items = await screen.findAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "My applications",
      "Event catalog",
      "Account settings",
      "Sign out",
    ])
    expect(screen.getByRole("menuitem", { name: "Event catalog" })).toHaveAttribute(
      "href",
      "/catalog",
    )
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveAttribute(
      "href",
      "/participant/account",
    )
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }))
    expect(signOut).toHaveBeenCalled()
  })

  // Figma F5 (18471:20359): the organizer's menu has „Akce“ and leads to the organizer's settings.
  it("leads the organizer to the organizer's account settings", async () => {
    renderMenu({ ...user, accountType: "ORGANIZER", name: "Eva Malá" })
    await userEvent.click(screen.getByRole("button", { name: /Account menu/ }))

    const items = await screen.findAllByRole("menuitem")
    expect(items.map((item) => item.textContent)).toEqual([
      "Events",
      "Account settings",
      "Sign out",
    ])
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveAttribute(
      "href",
      "/organizer/account",
    )
  })
})
