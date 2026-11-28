import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SignInForm } from "@/features/auth/components/SignInForm"

describe("SignInForm password visibility", () => {
  it("preserves the password, selection and input focus without submitting", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )
    const input = screen.getByLabelText<HTMLInputElement>("Password")
    expect(input).toHaveAttribute("type", "password")
    await user.type(input, "SecretPassword!")
    input.setSelectionRange(2, 6, "backward")

    await user.click(screen.getByRole("button", { name: "Show password" }))

    expect(input).toHaveAttribute("type", "text")
    expect(input).toHaveValue("SecretPassword!")
    expect(input).toHaveFocus()
    expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([
      2,
      6,
      "backward",
    ])

    await user.click(screen.getByRole("button", { name: "Hide password" }))

    expect(input).toHaveAttribute("type", "password")
    expect(input).toHaveValue("SecretPassword!")
    expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([
      2,
      6,
      "backward",
    ])
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText("Enter your e-mail")).not.toBeInTheDocument()
  })

  it("supports Enter and Space on the toggle, then submits the unchanged password", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )
    await user.type(screen.getByLabelText("E-mail"), "person@example.com")
    const input = screen.getByLabelText("Password")
    await user.type(input, "SecretPassword!")
    await user.tab()
    expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(input).toHaveAttribute("type", "text")
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveFocus()
    await user.keyboard(" ")
    expect(input).toHaveAttribute("type", "password")
    expect(onSubmit).not.toHaveBeenCalled()
    await user.tab()
    await user.keyboard("{Enter}")
    expect(onSubmit).toHaveBeenCalledWith(
      { email: "person@example.com", password: "SecretPassword!" },
      expect.anything(),
    )
  })

  it("keeps the e-mail typed in the other mode of the card", () => {
    render(
      <SignInForm
        defaultEmail="petra@example.com"
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("E-mail")).toHaveValue("petra@example.com")
  })
})

describe("SignInForm „No password?“", () => {
  it("sits next to the password label and hands on the e-mail typed so far", async () => {
    const user = userEvent.setup()
    const onRequestLink = vi.fn()
    render(
      <SignInForm
        onRequestLink={onRequestLink}
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText("E-mail"), " petra@example.com ")

    await user.click(screen.getByRole("button", { name: "No password?" }))

    expect(onRequestLink).toHaveBeenCalledWith("petra@example.com")
  })

  it("is not offered without a link to switch to (organizers)", () => {
    render(
      <SignInForm
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole("button", { name: "No password?" })).not.toBeInTheDocument()
  })

  it("shows a failure as one line above the button", () => {
    render(
      <SignInForm
        isLoading={false}
        errorMessage="The e-mail or password is incorrect."
        onSubmit={vi.fn()}
      />,
    )

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("The e-mail or password is incorrect.")
    expect(
      alert.compareDocumentPosition(screen.getByRole("button", { name: "Sign in" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
