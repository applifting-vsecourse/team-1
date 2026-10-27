import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import { useSignOut } from "@/features/auth/hooks/useSignOut"

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signOut: vi.fn().mockResolvedValue({ data: null, error: { message: "x" } }) },
}))

afterEach(() => vi.restoreAllMocks())

describe("useSignOut", () => {
  it("shows an error toast when signing out fails", async () => {
    const error = vi.spyOn(notify, "error").mockReturnValue("id")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useSignOut(), { wrapper })
    result.current.mutate()
    await waitFor(() => expect(error).toHaveBeenCalledWith("Could not sign out. Try again."))
  })
})
