import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { useSignIn } from "@/features/auth/hooks/useSignIn"

const authClient = vi.hoisted(() => ({
  signIn: { email: vi.fn() },
  getSession: vi.fn(),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({ authClient }))

const sessionUser = {
  id: "u1",
  email: "organizator@example.com",
  name: "Olga",
  accountType: "ORGANIZER",
  mustSetPassword: false,
}

describe("useSignIn", () => {
  beforeEach(() => {
    authClient.signIn.email.mockResolvedValue({ error: null })
    authClient.getSession.mockResolvedValue({ data: { user: sessionUser }, error: null })
  })

  // The login page does not observe the session, so the signed-out `null` sits
  // in the cache unused. The route guard reads the cache (ensureQueryData), so
  // it must already hold the new session when the sign-in resolves — otherwise
  // the guard bounces the user back to the login page (two clicks to get in).
  it("leaves the new session in the cache, replacing the signed-out one", async () => {
    // What the login page's loader does: caches the signed-out session.
    authClient.getSession.mockResolvedValueOnce({ data: null, error: null })
    const queryClient = new QueryClient()
    await queryClient.ensureQueryData(authSessionQueryOptions())
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useSignIn("ORGANIZER"), { wrapper })

    await result.current.mutateAsync({ email: sessionUser.email, password: "password1" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const session = await queryClient.ensureQueryData(authSessionQueryOptions())
    expect(session?.user.email).toBe(sessionUser.email)
  })

  // Without it better-auth caps the session at 24 h and never extends it.
  it("signs in with a remembered session", async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useSignIn("ORGANIZER"), { wrapper })

    await result.current.mutateAsync({ email: sessionUser.email, password: "password1" })

    expect(authClient.signIn.email).toHaveBeenCalledWith(
      expect.objectContaining({ rememberMe: true }),
    )
  })
})
