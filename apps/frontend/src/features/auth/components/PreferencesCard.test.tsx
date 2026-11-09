import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { PreferencesCard } from "@/features/auth/components/PreferencesCard"

import "@/i18n"

const { setTheme, mutateAsync } = vi.hoisted(() => ({
  setTheme: vi.fn<(theme: string) => void>(),
  mutateAsync: vi.fn<(change: unknown) => Promise<{ locale: string }>>(),
}))
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", setTheme }) }))
vi.mock("@/features/auth/hooks/useUpdateProfile", () => ({
  useUpdateProfile: () => ({ mutateAsync, isPending: false }),
}))
vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn() } }))

const user = { name: "Eva Malá", locale: "cs" } as SessionUser

// jsdom lacks what the Radix select uses to open its list.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

describe("PreferencesCard", () => {
  beforeEach(() => {
    setTheme.mockReset()
    mutateAsync.mockReset()
  })

  it("shows the current theme and applies a chosen one at once", async () => {
    render(<PreferencesCard user={user} />)

    const select = screen.getByRole("combobox", { name: "Theme" })
    expect(select).toHaveTextContent("Light")

    await userEvent.click(select)
    await userEvent.click(await screen.findByRole("option", { name: "Dark" }))
    expect(setTheme).toHaveBeenCalledWith("dark")
  })

  it("saves a chosen language to the account at once", async () => {
    mutateAsync.mockResolvedValue({ locale: "en" })
    render(<PreferencesCard user={user} />)

    const select = screen.getByRole("combobox", { name: "Language" })
    expect(select).toHaveTextContent("Čeština")

    await userEvent.click(select)
    await userEvent.click(await screen.findByRole("option", { name: "English" }))

    expect(mutateAsync).toHaveBeenCalledWith({ locale: "en" })
    expect(notify.success).toHaveBeenCalled()
  })
})
