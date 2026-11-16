import type { EmailService } from "@/core/email/interfaces/email-service.interface"
import type { PrismaService } from "@/core/prisma/prisma.service"
import type { AuthUserRepository } from "@/shared/auth/repositories/auth-user.repository"
import type { Config } from "@/shared/config/config.service"
import * as React from "react"
import { betterAuthProvider } from "./better-auth.provider"

type VerificationOptions = {
  sendOnSignUp: boolean
  sendVerificationEmail: (data: { user: Record<string, unknown>; url: string }) => Promise<void>
}

const mockCaptured = { options: undefined as unknown }
jest.mock("better-auth", () => ({
  betterAuth: (options: unknown) => {
    mockCaptured.options = options
    return {}
  },
}))
jest.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: () => ({}) }))
jest.mock("better-auth/api", () => ({
  createAuthEndpoint: () => ({}),
  createAuthMiddleware: () => ({}),
}))
jest.mock("better-auth/cookies", () => ({ setSessionCookie: jest.fn() }))
jest.mock("better-auth/plugins", () => ({
  openAPI: () => ({ id: "open-api" }),
  magicLink: () => ({ id: "magic-link" }),
}))

// @react-email/render needs --experimental-vm-modules under jest: use the plain React renderer.
jest.mock("@/core/email/render", () => ({
  renderEmail: async (Component: React.ComponentType<object>, props: object) => {
    const { prerender } = await import("react-dom/static")
    const { prelude } = await prerender(React.createElement(Component, props))
    return new Response(prelude).text()
  },
}))

describe("verification e-mail at sign-up", () => {
  const sendEmail = jest.fn<Promise<void>, [string, string, string]>()
  const findEmail = jest.fn<Promise<string | null>, [string]>()

  const verification = (): VerificationOptions => {
    const factory = betterAuthProvider as unknown as {
      useFactory: (...args: unknown[]) => unknown
    }
    factory.useFactory(
      {} as PrismaService,
      { backendUrl: "http://localhost:4050" } as Config,
      { sendEmail } as unknown as EmailService,
      { findEmail } as unknown as AuthUserRepository,
    )
    return (mockCaptured.options as { emailVerification: VerificationOptions }).emailVerification
  }

  beforeEach(() => {
    sendEmail.mockReset()
    findEmail.mockReset()
  })

  it("is sent on sign-up", () => {
    expect(verification().sendOnSignUp).toBe(true)
  })

  it.each([
    ["en", "Confirm your email for Togena"],
    ["cs", "Potvrďte svůj e-mail v Togeně"],
  ])("goes to a new organizer in %s", async (locale, subject) => {
    findEmail.mockResolvedValue("org@example.com")
    await verification().sendVerificationEmail({
      user: { id: "u1", email: "org@example.com", accountType: "ORGANIZER", locale },
      url: "https://example.com/verify",
    })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0]).toBe("org@example.com")
    expect(sendEmail.mock.calls[0][1]).toBe(subject)
    expect(sendEmail.mock.calls[0][2]).toContain(`lang="${locale}"`)
  })

  it("is not sent to a participant", async () => {
    findEmail.mockResolvedValue("p@example.com")
    await verification().sendVerificationEmail({
      user: { id: "u2", email: "p@example.com", accountType: "PARTICIPANT", locale: "cs" },
      url: "https://example.com/verify",
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
