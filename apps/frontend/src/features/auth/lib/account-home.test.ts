import { describe, expect, it } from "vitest"

import { ROUTES } from "@/app/routes"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { accountHome } from "@/features/auth/lib/account-home"

const user = (overrides: Partial<SessionUser>): SessionUser => ({
  id: "u1",
  email: "jana@example.com",
  name: "Jana",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
  ...overrides,
})

describe("accountHome", () => {
  it("sends an organizer to the events list", () => {
    expect(accountHome(user({ accountType: "ORGANIZER" }))).toBe(ROUTES.organizer.events)
  })

  it("sends a participant to their application", () => {
    expect(accountHome(user({}))).toBe(ROUTES.participant.applications)
  })

  it("sends a participant without a password to choose one first", () => {
    expect(accountHome(user({ mustSetPassword: true }))).toBe(ROUTES.participant.setPassword)
  })

  it("keeps the admin on the landing page — no admin UI yet", () => {
    expect(accountHome(user({ accountType: "ADMIN" }))).toBe(ROUTES.home)
  })
})
