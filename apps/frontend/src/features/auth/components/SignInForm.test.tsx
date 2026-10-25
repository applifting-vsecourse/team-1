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
        emailHint="Account e-mail"
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
        emailHint="Account e-mail"
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
})
