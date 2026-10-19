import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"

import { useSignOut } from "@/features/auth/hooks/useSignOut"

const { signOut, navigate } = vi.hoisted(() => ({ signOut: vi.fn(), navigate: vi.fn() }))

vi.mock("@/features/auth/lib/auth-client", () => ({ authClient: { signOut } }))
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

describe("useSignOut", () => {
  beforeEach(() => {
    signOut.mockReset()
    navigate.mockReset()
  })

  it("ends the session, forgets the cached account and leaves the area", async () => {
    signOut.mockResolvedValue({ error: null })
    const queryClient = new QueryClient()
    queryClient.setQueryData(authKeys.session(), { user: { id: "u1" } })
    queryClient.setQueryData(["secret"], "organizer data")
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useSignOut(), { wrapper })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: ROUTES.home }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(authKeys.session())).toBeNull()
    expect(queryClient.getQueryData(["secret"])).toBeUndefined()
  })

  it("stays put when the server refuses to end the session", async () => {
    signOut.mockResolvedValue({ error: { message: "boom" } })
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useSignOut(), { wrapper })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(navigate).not.toHaveBeenCalled()
  })
})
