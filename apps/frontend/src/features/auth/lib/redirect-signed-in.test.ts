import { QueryClient } from "@tanstack/react-query"
import { isRedirect } from "@tanstack/react-router"
import { describe, expect, it, vi } from "vitest"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"

import type { Session, SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { redirectSignedIn } from "@/features/auth/lib/redirect-signed-in"

const user = (overrides: Partial<SessionUser>): SessionUser => ({
  id: "u1",
  email: "jana@example.com",
  name: "Jana",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
  ...overrides,
})

const withSession = (session: Session) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), session)
  return queryClient
}

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error("expected the loader to redirect")
}

describe("redirectSignedIn", () => {
  it("shows the landing to a signed-out visitor", async () => {
    await expect(redirectSignedIn(withSession(null))).resolves.toBeUndefined()
  })

  it("sends an organizer to the dashboard", async () => {
    const error = await rejection(
      redirectSignedIn(withSession({ user: user({ accountType: "ORGANIZER" }) })),
    )
    expect(isRedirect(error)).toBe(true)
    expect(error).toMatchObject({ options: { to: ROUTES.organizer.dashboard } })
  })

  it("sends a participant to their applications", async () => {
    const error = await rejection(redirectSignedIn(withSession({ user: user({}) })))
    expect(error).toMatchObject({ options: { to: ROUTES.participant.applications } })
  })

  it("keeps the admin on the landing, since the admin has no area", async () => {
    const session = { user: user({ accountType: "ADMIN" }) }
    await expect(redirectSignedIn(withSession(session))).resolves.toBeUndefined()
  })

  it("shows the landing when the session request fails", async () => {
    const queryClient = new QueryClient()
    vi.spyOn(queryClient, "ensureQueryData").mockRejectedValue(new Error("offline"))
    await expect(redirectSignedIn(queryClient)).resolves.toBeUndefined()
  })
})
