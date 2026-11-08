import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { ThemeSetting } from "@/features/auth/components/ThemeSetting"

import "@/i18n"

const setTheme = vi.fn()
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme }) }))

// jsdom lacks what the Radix select uses to open its list.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

describe("ThemeSetting", () => {
  it("shows the current theme and applies a chosen one at once", async () => {
    render(<ThemeSetting />)

    const select = screen.getByRole("combobox", { name: "Theme" })
    expect(select).toHaveTextContent("Light")

    await userEvent.click(select)
    await userEvent.click(await screen.findByRole("option", { name: "Dark" }))

    expect(setTheme).toHaveBeenCalledWith("dark")
  })
})
