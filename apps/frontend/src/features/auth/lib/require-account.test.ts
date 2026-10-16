import { QueryClient } from "@tanstack/react-query"
import { isRedirect, type ParsedLocation } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"
import { ForbiddenError } from "@/lib/errors"

import type { Session, SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { requireAccount } from "@/features/auth/lib/require-account"

const user = (overrides: Partial<SessionUser>): SessionUser => ({
  id: "u1",
  email: "jana@example.com",
  name: "Jana",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
  ...overrides,
})

const location = { href: "/organizer/events" } as ParsedLocation

const guard = (session: Session, accountType: SessionUser["accountType"]) => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(authKeys.session(), session)
  return requireAccount({
    queryClient,
    location,
    loginRoute: ROUTES.organizer.login,
    accountType,
  })
}

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error("expected the guard to throw")
}

describe("requireAccount", () => {
  it("lets the right account type in", async () => {
    const session = { user: user({ accountType: "ORGANIZER" }) }
    await expect(guard(session, "ORGANIZER")).resolves.toEqual({ session })
  })

  it("sends a signed-out visitor to the login page and remembers where they were", async () => {
    const error = await rejection(guard(null, "ORGANIZER"))
    expect(isRedirect(error)).toBe(true)
    expect(error).toMatchObject({
      options: {
        to: ROUTES.organizer.login,
        search: { from: encodeURIComponent("/organizer/events") },
      },
    })
  })

  it("answers a participant in the organizer area with 403", async () => {
    const error = await rejection(guard({ user: user({}) }, "ORGANIZER"))
    expect(error).toBeInstanceOf(ForbiddenError)
  })

  it("sends a participant without a password to set one first", async () => {
    const error = await rejection(guard({ user: user({ mustSetPassword: true }) }, "PARTICIPANT"))
    expect(isRedirect(error)).toBe(true)
    expect(error).toMatchObject({ options: { to: ROUTES.participant.setPassword } })
  })
})
