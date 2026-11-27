import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"
import { authKeys } from "@/lib/auth-keys"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { EmailChangeLinkInvalid } from "@/features/auth/components/EmailChangeLinkInvalid"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock("@/components/templates/AuthLayout", () => ({
  AuthLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: {} }))

const user = (accountType: SessionUser["accountType"]): SessionUser => ({
  id: "u1",
  email: "kuba@example.com",
  name: "Kuba",
  accountType,
  mustSetPassword: false,
  locale: "en",
})

const renderPage = (session: SessionUser | null) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), session && { user: session })
  render(
    <QueryClientProvider client={queryClient}>
      <EmailChangeLinkInvalid />
    </QueryClientProvider>,
  )
}

describe("EmailChangeLinkInvalid", () => {
  afterEach(() => i18n.changeLanguage("en"))

  it("says the link doesn't work and leads to the account settings to change the e-mail again", () => {
    renderPage(user("ORGANIZER"))

    expect(
      screen.getByRole("heading", { level: 1, name: "This link doesn't work" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Change e-mail again" })).toHaveAttribute(
      "href",
      "/organizer/account",
    )
  })

  it("leads a participant, or someone signed out, to the participant's settings", () => {
    renderPage(null)

    expect(screen.getByRole("link", { name: "Change e-mail again" })).toHaveAttribute(
      "href",
      "/participant/account",
    )
  })

  it("is written in formal Czech", async () => {
    await i18n.changeLanguage("cs")
    renderPage(user("PARTICIPANT"))

    expect(screen.getByRole("heading", { name: "Tento odkaz nefunguje" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Změnit e-mail znovu" })).toBeInTheDocument()
  })
})
