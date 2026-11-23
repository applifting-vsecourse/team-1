import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"

afterEach(() => vi.unstubAllGlobals())

it("focuses the footer close action before the primary action", async () => {
  const user = userEvent.setup()
  render(
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogTitle>Edit program block</DialogTitle>
        <DialogDescription>Enter the program details.</DialogDescription>
        <DialogFooter showCloseButton>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  )

  await waitFor(() => expect(screen.getByRole("button", { name: "Close" })).toHaveFocus())
  await user.tab()
  expect(screen.getByRole("button", { name: "Save changes" })).toHaveFocus()
})

it("repositions the dialog when the keyboard resizes and pans the visual viewport", () => {
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 })
  vi.stubGlobal("visualViewport", viewport)
  vi.stubGlobal("innerHeight", 800)

  render(
    <Dialog open>
      <DialogContent className="max-h-[90dvh]">
        <DialogTitle>Edit program block</DialogTitle>
        <DialogDescription>Enter the program details.</DialogDescription>
      </DialogContent>
    </Dialog>,
  )

  const dialog = screen.getByRole("dialog")
  const { style } = dialog
  expect(dialog).not.toHaveAttribute("data-visual-viewport-constrained")
  expect(style.getPropertyValue("--dialog-viewport-top")).toBe("0px")
  expect(style.getPropertyValue("--dialog-viewport-center")).toBe("400px")
  expect(style.getPropertyValue("--dialog-viewport-height")).toBe("800px")

  act(() => {
    viewport.height = 360
    viewport.dispatchEvent(new Event("resize"))
  })

  expect(dialog).toHaveAttribute("data-visual-viewport-constrained", "true")
  expect(style.getPropertyValue("--dialog-viewport-center")).toBe("180px")
  expect(style.getPropertyValue("--dialog-viewport-height")).toBe("360px")

  act(() => {
    viewport.offsetTop = 80
    viewport.dispatchEvent(new Event("scroll"))
  })

  expect(style.getPropertyValue("--dialog-viewport-center")).toBe("260px")
  expect(style.getPropertyValue("--dialog-viewport-top")).toBe("80px")
})
