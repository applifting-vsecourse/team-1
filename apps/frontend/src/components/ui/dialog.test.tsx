import { act, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

afterEach(() => vi.unstubAllGlobals())

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
})
