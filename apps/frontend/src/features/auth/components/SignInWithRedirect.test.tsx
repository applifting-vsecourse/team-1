import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignInWithRedirect } from "@/features/auth/components/SignInWithRedirect"

const { signInEmail, getSession, signOut, navigate } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { email: signInEmail }, getSession, signOut },
}))

const sessionOf = (accountType: string) => ({
  data: {
    user: {
      id: "u1",
      email: "a@example.com",
      name: "A",
      accountType,
      mustSetPassword: false,
    },
  },
  error: null,
})
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

const renderForm = (props: { from?: string; accountType?: "ORGANIZER" | "PARTICIPANT" } = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SignInWithRedirect
        accountType="ORGANIZER"
        fallback="/organizer"
        emailHint="Use the e-mail of your account."
        {...props}
      />
    </QueryClientProvider>,
  )

const submit = async (email: string, password: string) => {
  await userEvent.type(screen.getByLabelText("E-mail"), email)
  if (password) await userEvent.type(screen.getByLabelText("Password"), password)
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("SignInWithRedirect", () => {
  beforeEach(() => {
    signInEmail.mockReset()
    getSession.mockReset()
    signOut.mockReset()
    navigate.mockReset()
    getSession.mockResolvedValue(sessionOf("ORGANIZER"))
    signOut.mockResolvedValue({ error: null })
  })

  it("signs in with e-mail and password and opens the area home", async () => {
    signInEmail.mockResolvedValue({ error: null })
    renderForm()

    await submit("organizator@example.com", "password1")

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/organizer" }))
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "organizator@example.com", password: "password1" }),
    )
  })

  it("returns to the page the visitor came from", async () => {
    signInEmail.mockResolvedValue({ error: null })
    renderForm({ from: encodeURIComponent("/organizer/events") })

    await submit("organizator@example.com", "password1")

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/organizer/events" }))
  })

  it("shows the same generic message for any failure, never which part was wrong", async () => {
    signInEmail.mockResolvedValueOnce({ error: { message: "Invalid password" } })
    const { unmount } = renderForm()
    await submit("organizator@example.com", "wrong")
    const wrongPassword = (await screen.findByRole("alert")).textContent
    unmount()

    signInEmail.mockResolvedValueOnce({ error: { message: "User not found" } })
    renderForm()
    await submit("nobody@example.com", "whatever")
    const unknownEmail = (await screen.findByRole("alert")).textContent

    expect(wrongPassword).toContain("Wrong e-mail or password.")
    expect(unknownEmail).toBe(wrongPassword)
    expect(navigate).not.toHaveBeenCalled()
  })

  it("refuses a participant on the organizer sign-in and ends the session again", async () => {
    signInEmail.mockResolvedValue({ error: null })
    getSession.mockResolvedValue(sessionOf("PARTICIPANT"))
    renderForm()

    await submit("ucastnik@example.com", "password4")

    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong e-mail or password.")
    expect(signOut).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("asks for the missing fields instead of calling the server", async () => {
    renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByText("Enter your e-mail")).toBeInTheDocument()
    expect(screen.getByText("Enter your password")).toBeInTheDocument()
    expect(signInEmail).not.toHaveBeenCalled()
  })
})
