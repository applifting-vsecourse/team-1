import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import { EmailChangeLinkInvalid } from "@/features/auth/components/EmailChangeLinkInvalid"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock("@/components/organisms/Header", () => ({ Header: () => <header /> }))

describe("EmailChangeLinkInvalid", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en")
  })

  it("says the e-mail stays as it is and offers to sign in and start again", () => {
    render(<EmailChangeLinkInvalid />)

    expect(screen.getByRole("heading", { name: "The link is no longer valid" })).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't verify the e-mail change.")
    expect(screen.getByRole("alert")).toHaveTextContent("current e-mail is unchanged")
    expect(screen.getByRole("link", { name: "Sign in and change e-mail" })).toHaveAttribute(
      "href",
      "/",
    )
  })

  it("is written in formal Czech", async () => {
    await i18n.changeLanguage("cs")
    render(<EmailChangeLinkInvalid />)

    expect(screen.getByRole("heading", { name: "Odkaz už není platný" })).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Změnu e-mailu se nepodařilo ověřit.")
    expect(screen.getByRole("alert")).toHaveTextContent("Změnu můžete znovu zahájit")
    expect(screen.getByRole("link", { name: "Přihlásit se a změnit e-mail" })).toBeInTheDocument()
  })
})
