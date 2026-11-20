import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { i18n } from "@/i18n"
import { authKeys } from "@/lib/auth-keys"

import { useApplyPreferredLanguage } from "@/features/auth/hooks/useApplyPreferredLanguage"

const session = (locale: "en" | "cs" | null, id = "u1") => ({
  user: { id, email: "a@example.com", name: "A", accountType: "PARTICIPANT", locale },
})

function setup() {
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  renderHook(() => useApplyPreferredLanguage(), { wrapper })
  return queryClient
}

describe("useApplyPreferredLanguage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en")
  })
  afterEach(async () => {
    await i18n.changeLanguage("en")
  })

  it("switches the UI to the preferred language when the session appears", () => {
    const queryClient = setup()

    act(() => {
      queryClient.setQueryData(authKeys.session(), session("cs"))
    })

    expect(i18n.resolvedLanguage).toBe("cs")
  })

  it("keeps the browser language for a user who never chose one", () => {
    const queryClient = setup()

    act(() => {
      queryClient.setQueryData(authKeys.session(), session(null))
    })

    expect(i18n.resolvedLanguage).toBe("en")
  })

  it("applies it once per sign-in, so a later pick on a public page is not overridden", async () => {
    const queryClient = setup()
    act(() => {
      queryClient.setQueryData(authKeys.session(), session("cs"))
    })
    await act(async () => {
      await i18n.changeLanguage("en")
    })

    act(() => {
      queryClient.setQueryData(authKeys.session(), session("cs"))
    })
    expect(i18n.resolvedLanguage).toBe("en")

    act(() => {
      queryClient.setQueryData(authKeys.session(), null)
      queryClient.setQueryData(authKeys.session(), session("cs"))
    })
    expect(i18n.resolvedLanguage).toBe("cs")
  })
})
