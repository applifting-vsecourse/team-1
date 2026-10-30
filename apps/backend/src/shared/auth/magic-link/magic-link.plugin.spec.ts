import type { EmailService } from "@/core/email/interfaces/email-service.interface"
import type { Config } from "@/shared/config/config.service"
import * as React from "react"
import { createMagicLinkPlugin } from "./magic-link.plugin"
import { magicLinkLocale } from "./magic-link.shared"

type SendMagicLink = (
  data: { email: string; token: string; url: string; metadata?: Record<string, unknown> },
  ctx: unknown,
) => Promise<void>

const mockCaptured = { sendMagicLink: undefined as unknown }
jest.mock("better-auth/plugins", () => ({
  magicLink: (options: { sendMagicLink: unknown }) => {
    mockCaptured.sendMagicLink = options.sendMagicLink
    return { id: "magic-link" }
  },
}))

// @react-email/render needs --experimental-vm-modules under jest: use the plain React renderer.
jest.mock("@/core/email/render", () => ({
  renderEmail: async (Component: React.ComponentType<object>, props: object) => {
    const { prerender } = await import("react-dom/static")
    const { prelude } = await prerender(React.createElement(Component, props))
    return new Response(prelude).text()
  },
}))

describe("magic-link e-mail language", () => {
  const sendEmail = jest.fn<Promise<void>, [string, string, string]>()
  const emailProvider = { sendEmail } as unknown as EmailService
  const config = { frontendUrl: "http://localhost:3050" } as Config

  // The account's own locale is `en` in every case: the language of the request wins.
  const ctxFor = (userLocale: string) => ({
    context: {
      internalAdapter: {
        findUserByEmail: async () => ({ user: { accountType: "PARTICIPANT", locale: userLocale } }),
        deleteVerificationByIdentifier: jest.fn(),
      },
    },
  })

  const send = (metadata: Record<string, unknown> | undefined, userLocale = "en") =>
    (mockCaptured.sendMagicLink as SendMagicLink)(
      { email: "petra@example.com", token: "t", url: "x", metadata },
      ctxFor(userLocale),
    )

  beforeEach(() => {
    sendEmail.mockReset()
    createMagicLinkPlugin(config, emailProvider)
  })

  it("sends Czech when the request came from the Czech UI, whatever User.locale says", async () => {
    await send({ locale: "cs" }, "en")

    expect(sendEmail.mock.calls[0][1]).toBe("Váš přihlašovací odkaz do Togeny")
    expect(sendEmail.mock.calls[0][2]).toContain('lang="cs"')
  })

  it("sends English when the request came from the English UI, whatever User.locale says", async () => {
    await send({ locale: "en" }, "cs")

    expect(sendEmail.mock.calls[0][1]).toBe("Your Togena sign-in link")
    expect(sendEmail.mock.calls[0][2]).toContain('lang="en"')
  })

  it("falls back to English when the language is missing", async () => {
    await send(undefined, "cs")

    expect(sendEmail.mock.calls[0][1]).toBe("Your Togena sign-in link")
  })
})

describe("magicLinkLocale", () => {
  it.each([
    [{ locale: "cs" }, "cs"],
    [{ locale: "en" }, "en"],
    [{ locale: "de" }, "en"],
    [{ locale: 5 }, "en"],
    [{}, "en"],
    [undefined, "en"],
  ])("%j -> %s", (metadata, expected) => {
    expect(magicLinkLocale(metadata)).toBe(expected)
  })
})
