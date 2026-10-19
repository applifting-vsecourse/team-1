import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MagicLinkLanding } from "@/features/auth/components/MagicLinkLanding"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { magicLink: vi.fn() } },
}))
vi.mock("@/components/templates/AuthLayout", () => ({
  AuthLayout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}))
vi.mock("@/components/atoms/Seo", () => ({ Seo: () => null }))

const renderLanding = (props: { token?: string; error?: string }) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MagicLinkLanding {...props} />
    </QueryClientProvider>,
  )

describe("MagicLinkLanding", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("does not spend the token by merely opening the page", () => {
    const assign = vi.fn()
    vi.stubGlobal("location", { origin: "http://localhost:3050", assign })

    renderLanding({ token: "abc" })

    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
    expect(assign).not.toHaveBeenCalled()
  })

  it("spends it on the click: goes to the verify endpoint with where to return", async () => {
    const assign = vi.fn()
    vi.stubGlobal("location", { origin: "http://localhost:3050", assign })
    renderLanding({ token: "abc" })

    await userEvent.click(screen.getByRole("button", { name: "Continue" }))

    const [target] = assign.mock.calls[0] as [string]
    const url = new URL(target)
    expect(url.pathname).toBe("/api/auth/magic-link/verify")
    expect(url.searchParams.get("token")).toBe("abc")
    expect(url.searchParams.get("callbackURL")).toBe("http://localhost:3050/participant")
    expect(url.searchParams.get("errorCallbackURL")).toBe(
      "http://localhost:3050/participant/magic-link",
    )
  })

  it("explains a refused link and offers a new one", () => {
    renderLanding({ token: "abc", error: "INVALID_TOKEN" })

    expect(screen.getByText("The link no longer works")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Request a new link")
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send me a link" })).toBeInTheDocument()
  })

  it("offers a new link when the page is opened without a token", () => {
    renderLanding({})

    expect(screen.queryByText("The link no longer works")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send me a link" })).toBeInTheDocument()
  })
})
