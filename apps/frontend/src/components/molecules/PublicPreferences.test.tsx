import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"

import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
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
  render(<LanguageSwitcher />)
  await user.click(screen.getByRole("button"))
  expect(screen.getByRole("menuitemradio", { name: "English" })).toBeChecked()
  await user.click(screen.getByRole("menuitemradio", { name: "Čeština" }))
  await user.click(screen.getByRole("button"))
  expect(screen.getByRole("menuitemradio", { name: "Čeština" })).toBeChecked()
})

it("identifies system mode even when the operating system uses a light palette", async () => {
  const user = userEvent.setup()
  render(<ThemeSwitcher />)
  const button = screen.getByRole("button")
  expect(button.querySelector(".lucide-monitor")).not.toBeNull()
  await user.click(button)
  expect(screen.getByRole("menuitemradio", { name: /System/i })).toBeChecked()
  await user.click(screen.getByRole("menuitemradio", { name: "Dark" }))
  expect(setTheme).toHaveBeenCalledWith("dark")
})
