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

  it("shows an error toast when the clipboard is unavailable", async () => {
    const error = vi.spyOn(notify, "error").mockReturnValue("id")
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"))
    render(
      <CopyButton
        value="abc"
        label="Copy"
      />,
    )
    await user.click(screen.getByRole("button", { name: "Copy" }))
    expect(error).toHaveBeenCalledWith("Could not copy. Copy the value manually.")
  })
})
