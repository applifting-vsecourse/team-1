import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RequestMagicLinkForm } from "@/features/auth/components/RequestMagicLinkForm"

const { magicLink } = vi.hoisted(() => ({ magicLink: vi.fn() }))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { magicLink } },
}))

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RequestMagicLinkForm />
    </QueryClientProvider>,
  )

describe("RequestMagicLinkForm", () => {
  beforeEach(() => magicLink.mockReset())

  it("asks for the e-mail and sends nothing without one", async () => {
    renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Send me a link" }))

    expect(await screen.findByText("Enter your e-mail")).toBeInTheDocument()
    expect(magicLink).not.toHaveBeenCalled()
  })

  it("requests a link and confirms without saying whether the account exists", async () => {
    magicLink.mockResolvedValue({ error: null })
    renderForm()

    await userEvent.type(screen.getByLabelText("E-mail"), "petra@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Send me a link" }))

    expect(await screen.findByText("Check your e-mail")).toBeInTheDocument()
    expect(screen.getByText(/If a participant account exists/)).toBeInTheDocument()
    expect(magicLink).toHaveBeenCalledWith({
      email: "petra@example.com",
      metadata: { locale: "en" },
    })
  })

  it("shows an error, and keeps the form, when the request fails", async () => {
    magicLink.mockResolvedValue({ error: { message: "Too many requests" } })
    renderForm()

    await userEvent.type(screen.getByLabelText("E-mail"), "petra@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Send me a link" }))

    expect(await screen.findByText("Couldn't send the link")).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument()
  })
})
