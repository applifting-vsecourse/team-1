import { act, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

afterEach(() => vi.unstubAllGlobals())

it("repositions the dialog when the keyboard resizes and pans the visual viewport", () => {
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 })
  vi.stubGlobal("visualViewport", viewport)

  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Edit program block</DialogTitle>
        <DialogDescription>Enter the program details.</DialogDescription>
      </DialogContent>
    </Dialog>,
  )

  const { style } = screen.getByRole("dialog")
  expect(style.getPropertyValue("--dialog-viewport-center")).toBe("400px")
  expect(style.getPropertyValue("--dialog-viewport-height")).toBe("800px")

  act(() => {
    viewport.height = 360
    viewport.dispatchEvent(new Event("resize"))
    viewport.offsetTop = 80
    viewport.dispatchEvent(new Event("scroll"))
  })

  expect(style.getPropertyValue("--dialog-viewport-center")).toBe("260px")
  expect(style.getPropertyValue("--dialog-viewport-height")).toBe("360px")
})
