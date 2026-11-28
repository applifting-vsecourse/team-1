import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AuthLayout } from "@/components/templates/AuthLayout"

const { header } = vi.hoisted(() => ({ header: vi.fn() }))

vi.mock("@/components/organisms/Header", () => ({
  Header: (props: { hasSignIn?: boolean; action?: React.ReactNode }) => {
    header(props)
    return <header>{props.action}</header>
  },
}))
vi.mock("@/components/organisms/PublicFooter", () => ({
  PublicFooter: ({ isMinimal }: { isMinimal?: boolean }) => (
    <footer>{isMinimal ? "minimal footer" : "full footer"}</footer>
  ),
}))

describe("AuthLayout", () => {
  it("puts the content in one card between the public header without Sign in and the minimal footer", () => {
    render(
      <AuthLayout>
        <h1>Sign-in</h1>
      </AuthLayout>,
    )

    expect(header).toHaveBeenCalledWith(expect.objectContaining({ hasSignIn: false }))
    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Sign-in" }),
    )
    expect(screen.getByRole("contentinfo")).toHaveTextContent("minimal footer")
  })

  it("puts the header action in place of Sign in and the extra content under the card", () => {
    render(
      <AuthLayout
        headerAction={<button type="button">Sign out</button>}
        below={<p>dots</p>}
      >
        <h1>Organization</h1>
      </AuthLayout>,
    )

    expect(screen.getByRole("banner")).toContainElement(
      screen.getByRole("button", { name: "Sign out" }),
    )
    expect(screen.getByRole("main")).toContainElement(screen.getByText("dots"))
  })
})
