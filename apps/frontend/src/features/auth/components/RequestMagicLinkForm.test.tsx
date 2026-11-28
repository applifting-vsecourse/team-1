import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RequestMagicLinkForm } from "@/features/auth/components/RequestMagicLinkForm"

const { magicLink } = vi.hoisted(() => ({ magicLink: vi.fn() }))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { magicLink } },
}))

const onSent = vi.fn()
const onUsePassword = vi.fn()

const renderForm = (props: { defaultEmail?: string; hasPassword?: boolean } = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RequestMagicLinkForm
        defaultEmail={props.defaultEmail}
        submitLabel="Send sign-in link"
        onSent={onSent}
        onUsePassword={props.hasPassword ? onUsePassword : undefined}
      />
    </QueryClientProvider>,
  )

const send = () => userEvent.click(screen.getByRole("button", { name: "Send sign-in link" }))

describe("RequestMagicLinkForm", () => {
  beforeEach(() => {
    magicLink.mockReset()
    onSent.mockReset()
    onUsePassword.mockReset()
  })

  it("asks for the e-mail and sends nothing without one", async () => {
    renderForm()

    await send()

    expect(await screen.findByText("Enter your e-mail")).toBeInTheDocument()
    expect(magicLink).not.toHaveBeenCalled()
  })

  it("requests a link in the UI language and hands the e-mail on", async () => {
    magicLink.mockResolvedValue({ error: null })
    renderForm({ defaultEmail: "petra@example.com" })

    await send()

    expect(magicLink).toHaveBeenCalledWith({
      email: "petra@example.com",
      metadata: { locale: "en" },
    })
    expect(onSent).toHaveBeenCalledWith("petra@example.com")
  })

  it("shows one line and keeps the form when the request fails", async () => {
    magicLink.mockResolvedValue({ error: { message: "boom", status: 500 } })
    renderForm({ defaultEmail: "petra@example.com" })

    await send()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The link couldn't be sent. Please try again.",
    )
    expect(screen.getByLabelText("E-mail")).toHaveValue("petra@example.com")
    expect(onSent).not.toHaveBeenCalled()
  })

  it("asks to wait when the server's rate limit refuses the request (429)", async () => {
    magicLink.mockResolvedValue({ error: { message: "Too many requests", status: 429 } })
    renderForm({ defaultEmail: "petra@example.com" })

    await send()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts in a short time. Wait a moment and try again.",
    )
  })

  it("leads back to the password with the e-mail typed so far", async () => {
    renderForm({ hasPassword: true })

    await userEvent.type(screen.getByLabelText("E-mail"), "petra@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Sign in with password" }))

    expect(onUsePassword).toHaveBeenCalledWith("petra@example.com")
  })
})
