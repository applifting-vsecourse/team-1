import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MagicLinkLanding } from "@/features/auth/components/MagicLinkLanding"

const { magicLink } = vi.hoisted(() => ({ magicLink: vi.fn() }))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { magicLink } },
}))
vi.mock("@/components/templates/AuthLayout", () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a
      href={to}
      {...rest}
    >
      {children}
    </a>
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
  afterEach(() => {
    vi.unstubAllGlobals()
    magicLink.mockReset()
  })

  it("does not spend the token by merely opening the page: a heading and Sign in, nothing else", () => {
    const assign = vi.fn()
    vi.stubGlobal("location", { origin: "http://localhost:3050", assign })

    renderLanding({ token: "abc" })

    expect(
      screen.getByRole("heading", { level: 1, name: "Sign in with the link from your e-mail" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument()
    expect(assign).not.toHaveBeenCalled()
  })

  it("spends it on the click: only the loader, then the verify endpoint with where to return", async () => {
    const assign = vi.fn()
    vi.stubGlobal("location", { origin: "http://localhost:3050", assign })
    renderLanding({ token: "abc" })

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

    expect(screen.getByRole("status")).toHaveTextContent("Verifying the link…")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    fireEvent(window, new Event("pageshow"))
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()

    const [target] = assign.mock.calls[0] as [string]
    const url = new URL(target)
    expect(url.pathname).toBe("/api/auth/magic-link/verify")
    expect(url.searchParams.get("token")).toBe("abc")
    expect(url.searchParams.get("callbackURL")).toBe(
      "http://localhost:3050/participant/set-password",
    )
    expect(url.searchParams.get("errorCallbackURL")).toBe(
      "http://localhost:3050/participant/magic-link",
    )
  })

  it("keeps the token unspent while offline: one sentence and Try again", async () => {
    const assign = vi.fn()
    vi.stubGlobal("location", { origin: "http://localhost:3050", assign })
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    try {
      renderLanding({ token: "abc" })
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
      expect(
        await screen.findByRole("heading", { name: "We couldn’t verify the link" }),
      ).toBeVisible()
      expect(screen.getByText("Check your connection and try again.")).toBeInTheDocument()
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(assign).not.toHaveBeenCalled()
      online.mockReturnValue(true)
      await userEvent.click(screen.getByRole("button", { name: "Try again" }))
      expect(assign).toHaveBeenCalledOnce()
    } finally {
      online.mockRestore()
    }
  })

  it.each([
    ["a refused link (spent or expired)", { token: "abc", error: "INVALID_TOKEN" }],
    ["a page opened without a token", {}],
  ])("for %s says the link doesn't work and asks for the e-mail, with no sentence", (_, props) => {
    renderLanding(props)

    expect(
      screen.getByRole("heading", { level: 1, name: "This link doesn't work" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send a new link" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument()
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument()
  })

  it("after sending a new link shows the sent state with the way back to the sign-in", async () => {
    magicLink.mockResolvedValue({ error: null })
    renderLanding({ error: "INVALID_TOKEN" })

    await userEvent.type(screen.getByLabelText("E-mail"), "petra@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Send a new link" }))

    expect(await screen.findByRole("heading", { name: "Check your e-mail" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to sign-in" })).toHaveAttribute(
      "href",
      "/participant/login",
    )
  })
})
