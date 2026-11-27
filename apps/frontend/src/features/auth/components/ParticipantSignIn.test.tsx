import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ParticipantSignIn } from "@/features/auth/components/ParticipantSignIn"

const { magicLink, signInEmail } = vi.hoisted(() => ({
  magicLink: vi.fn(),
  signInEmail: vi.fn(),
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { magicLink, email: signInEmail } },
}))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a
      href={to}
      {...rest}
    >
      {children}
    </a>
  ),
}))

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ParticipantSignIn />
    </QueryClientProvider>,
  )

const toSentState = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("E-mail"), "eva@example.com")
  await user.click(screen.getByRole("button", { name: "No password?" }))
  await user.click(screen.getByRole("button", { name: "Send sign-in link" }))
  await screen.findByRole("heading", { name: "Check your e-mail" })
}

describe("ParticipantSignIn", () => {
  beforeEach(() => {
    magicLink.mockReset()
    magicLink.mockResolvedValue({ error: null })
  })
  afterEach(() => vi.useRealTimers())

  it("starts with the e-mail and password, one button and the way to the organizer sign-in", () => {
    renderCard()

    expect(screen.getByRole("heading", { level: 1, name: "Applicant sign-in" })).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^Sign in/ })).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Sign in as an organizer" })).toHaveAttribute(
      "href",
      "/organizer/login",
    )
  })

  it("„No password?“ turns the same card into the link request and back, keeping the e-mail", async () => {
    const user = userEvent.setup()
    renderCard()
    await user.type(screen.getByLabelText("E-mail"), "eva@example.com")

    await user.click(screen.getByRole("button", { name: "No password?" }))

    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toHaveValue("eva@example.com")
    expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Sign in with password" }))

    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toHaveValue("eva@example.com")
  })

  it("after sending says where the link went, conditionally, and leads back to the sign-in", async () => {
    const user = userEvent.setup()
    renderCard()

    await toSentState(user)

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent(
      "We sent the link to eva@example.com if you used this e-mail in your application.",
    )
    expect(within(status).getByText("eva@example.com").tagName).toBe("STRONG")
    await user.click(screen.getByRole("button", { name: "Back to sign-in" }))
    expect(screen.getByLabelText("E-mail")).toHaveValue("eva@example.com")
  })

  it("counts down 30 seconds before it offers to resend, then counts again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderCard()
    await toSentState(user)

    expect(screen.getByText("Resend in 30 s")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Resend the link" })).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(29_000))
    expect(screen.getByText("Resend in 1 s")).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(1_000))

    await user.click(screen.getByRole("button", { name: "Resend the link" }))

    expect(magicLink).toHaveBeenCalledTimes(2)
    expect(await screen.findByText("Resend in 30 s")).toBeInTheDocument()
  })

  it("asks to wait when the server's rate limit refuses the resend (429)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderCard()
    await toSentState(user)
    magicLink.mockResolvedValue({ error: { message: "Too many requests", status: 429 } })
    await act(() => vi.advanceTimersByTimeAsync(30_000))

    await user.click(screen.getByRole("button", { name: "Resend the link" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts in a short time. Wait a moment and try again.",
    )
  })
})
