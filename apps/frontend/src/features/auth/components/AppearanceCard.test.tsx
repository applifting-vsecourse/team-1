import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { AppearanceCard } from "@/features/auth/components/AppearanceCard"

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

describe("AppearanceCard", () => {
  beforeEach(() => {
    setTheme.mockReset()
    mutateAsync.mockReset()
  })

  it("shows the current theme and applies a chosen one at once", async () => {
    render(<AppearanceCard user={user} />)

    const theme = screen.getByRole("radiogroup", { name: "Theme" })
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked()
    expect(theme).toBeVisible()

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }))
    expect(setTheme).toHaveBeenCalledWith("dark")
  })

  it("saves a chosen language to the account at once", async () => {
    mutateAsync.mockResolvedValue({ locale: "en" })
    render(<AppearanceCard user={user} />)

    expect(screen.getByRole("radio", { name: /Čeština/ })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: /English/ }))

    expect(mutateAsync).toHaveBeenCalledWith({ locale: "en" })
    expect(notify.success).toHaveBeenCalled()
  })

  it("does nothing when the current language is clicked again", async () => {
    render(<AppearanceCard user={user} />)

    await userEvent.click(screen.getByRole("radio", { name: /Čeština/ }))
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
