import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"

import { PreferencesRow } from "@/components/molecules/PreferencesRow"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { i18n } from "@/i18n"

const setTheme = vi.fn()
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "system", setTheme }) }))

afterEach(async () => {
  await act(() => i18n.changeLanguage("en"))
  setTheme.mockClear()
})

it("marks the current language and updates the selection when the visitor chooses another", async () => {
  const user = userEvent.setup()
  render(<PreferencesRow />)
  await user.click(screen.getByRole("button", { name: "Change language" }))
  expect(screen.getByRole("menuitemradio", { name: "English" })).toBeChecked()
  await user.click(screen.getByRole("menuitemradio", { name: "Čeština" }))
  await user.click(screen.getByRole("button", { name: "Změnit jazyk" }))
  expect(screen.getByRole("menuitemradio", { name: "Čeština" })).toBeChecked()
})

it("shows the theme as three segments with the current one pressed, and switches on a click", async () => {
  const user = userEvent.setup()
  render(<PreferencesRow />)
  const theme = screen.getByRole("radiogroup", { name: "Appearance" })

  expect(within(theme).getByRole("radio", { name: "System" })).toBeChecked()
  await user.click(within(theme).getByRole("radio", { name: "Dark" }))
  expect(setTheme).toHaveBeenCalledWith("dark")
})

// Nav A marker (DESIGN.md): the chosen segment is the nav-active surface with an ink icon and a 12 px orange underline.
it("marks the chosen theme segment with the nav A marker, like the view toggle", () => {
  render(<PreferencesRow />)
  const theme = screen.getByRole("radiogroup", { name: "Appearance" })
  const chosen = within(theme).getByRole("radio", { name: "System" })

  expect(chosen).toHaveAttribute("data-state", "on")
  expect(chosen).toHaveAttribute("aria-checked", "true")
  expect(chosen).toHaveClass(
    "data-[state=on]:bg-nav-active",
    "data-[state=on]:text-foreground",
    "data-[state=on]:after:bg-nav-indicator",
    "data-[state=on]:after:w-3",
  )
  expect(chosen.className).not.toMatch(/brand-warm|border-strong|bg-accent/)
})

it("identifies system mode in the header theme menu even when the system palette is light", async () => {
  const user = userEvent.setup()
  render(<ThemeSwitcher />)
  const button = screen.getByRole("button")
  expect(button.querySelector(".lucide-monitor")).not.toBeNull()
  await user.click(button)
  expect(screen.getByRole("menuitemradio", { name: /System/i })).toBeChecked()
  await user.click(screen.getByRole("menuitemradio", { name: "Dark" }))
  expect(setTheme).toHaveBeenCalledWith("dark")
})
