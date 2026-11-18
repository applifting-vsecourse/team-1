import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CopyButton } from "@/components/atoms/CopyButton"
import { notify } from "@/lib/notify"

afterEach(() => vi.restoreAllMocks())

describe("CopyButton", () => {
  it("shows a success toast after copying", async () => {
    const success = vi.spyOn(notify, "success").mockReturnValue("id")
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    render(
      <CopyButton
        value="abc"
        label="Copy"
      />,
    )
    await user.click(screen.getByRole("button", { name: "Copy" }))
    expect(success).toHaveBeenCalledWith("Copied to the clipboard")
  })

  it("offers the selected value for manual copying and restores focus after a failed write", async () => {
    const success = vi.spyOn(notify, "success").mockReturnValue("id")
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"))
    render(
      <CopyButton
        value="abc"
        label="Copy"
      />,
    )
    await user.click(screen.getByRole("button", { name: "Copy" }))
    expect(await screen.findByRole("dialog", { name: "Copying failed" })).toBeVisible()
    const field = screen.getByRole("textbox", { name: "Copy" }) as HTMLInputElement
    expect(field).toHaveValue("abc")
    expect(field.selectionStart).toBe(0)
    expect(field.selectionEnd).toBe(3)
    expect(success).not.toHaveBeenCalled()
    await user.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: "Copy" })).toHaveFocus()
  })
})
