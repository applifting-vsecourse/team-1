import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import { useEmailChangedNotice } from "@/features/auth/hooks/useEmailChangedNotice"

const { navigate, success } = vi.hoisted(() => ({ navigate: vi.fn(), success: vi.fn() }))

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))
vi.mock("@/lib/notify", () => ({ notify: { success } }))

describe("useEmailChangedNotice", () => {
  beforeEach(async () => {
    navigate.mockReset()
    success.mockReset()
    await i18n.changeLanguage("en")
  })

  it("says once that the e-mail has changed and drops the parameter from the address", () => {
    renderHook(() => useEmailChangedNotice(true, "eva.nova@example.cz"))

    expect(success).toHaveBeenCalledWith(
      "Your e-mail has been changed.",
      "Use eva.nova@example.cz the next time you sign in.",
    )
    expect(navigate).toHaveBeenCalledWith({ to: ".", search: {}, replace: true })
  })

  it("says nothing on an ordinary visit", () => {
    renderHook(() => useEmailChangedNotice(false, "eva.nova@example.cz"))

    expect(success).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
