import { QueryClient } from "@tanstack/react-query"
import type { ParsedLocation } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"

import type { Session, SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { guardSetPassword } from "@/features/auth/lib/guard-set-password"

const user = (overrides: Partial<SessionUser>): SessionUser => ({
  id: "u1",
  email: "jana@example.com",
  name: "Jana",
  accountType: "PARTICIPANT",
  mustSetPassword: true,
  ...overrides,
})

const withSession = (session: Session) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), session)
  return queryClient
}

const location = { href: "/participant/set-password" } as ParsedLocation

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  return undefined
}

describe("guardSetPassword", () => {
  it("lets a participant without a password set one", async () => {
    await expect(
      guardSetPassword(withSession({ user: user({}) }), location),
    ).resolves.toBeUndefined()
  })

  it("passes a participant who already has a password on to their applications", async () => {
    const error = await rejection(
      guardSetPassword(withSession({ user: user({ mustSetPassword: false }) }), location),
    )
    expect(error).toMatchObject({ options: { to: ROUTES.participant.applications } })
  })

  it("sends an organizer away", async () => {
    const error = await rejection(
      guardSetPassword(withSession({ user: user({ accountType: "ORGANIZER" }) }), location),
    )
    expect(error).toMatchObject({ options: { to: ROUTES.participant.applications } })
  })

  it("sends a signed-out visitor to the login", async () => {
    const error = await rejection(guardSetPassword(withSession(null), location))
    expect(error).toMatchObject({ options: { to: ROUTES.participant.login } })
  })
})
