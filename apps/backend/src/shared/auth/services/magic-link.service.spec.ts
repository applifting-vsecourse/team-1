import {
  MAGIC_LINK_TTL_SECONDS,
  magicLinkCapture,
  magicLinkLandingUrl,
} from "@/shared/auth/magic-link/magic-link.shared"
import type { BetterAuth } from "@/shared/auth/providers/better-auth.provider"
import { MagicLinkService } from "./magic-link.service"

// `magicLinkCapture` has no way to publish from outside, so the fake auth
// plays the plugin: it reads the requestId and answers like the callback does.
const authAnswering = (url: string | null): BetterAuth => {
  let captured: ((url: string | null) => void) | undefined
  const expect = magicLinkCapture.expect.bind(magicLinkCapture)
  jest.spyOn(magicLinkCapture, "expect").mockImplementation((id, listener) => {
    captured = listener
    expect(id, listener)
  })
  return {
    api: {
      signInMagicLink: jest.fn(() => {
        captured?.(url)
        return Promise.resolve({ status: true })
      }),
    },
  } as unknown as BetterAuth
}

describe("MagicLinkService", () => {
  afterEach(() => jest.restoreAllMocks())

  it("returns the link the plugin issued for a participant", async () => {
    const url = magicLinkLandingUrl("http://localhost:3050", "tok")
    const auth = authAnswering(url)

    await expect(new MagicLinkService(auth).createLink("a@example.com")).resolves.toBe(url)
    expect(
      (auth.api as unknown as { signInMagicLink: jest.Mock }).signInMagicLink,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ email: "a@example.com" }) as unknown,
      }),
    )
  })

  it("returns null when nobody was given a link (not a participant)", async () => {
    const service = new MagicLinkService(authAnswering(null))

    await expect(service.createLink("organizator@example.com")).resolves.toBeNull()
  })
})

describe("magic link settings", () => {
  it("is valid for 7 days", () => {
    expect(MAGIC_LINK_TTL_SECONDS).toBe(7 * 24 * 60 * 60)
  })

  it("points to a frontend page, never straight to the verify endpoint", () => {
    expect(magicLinkLandingUrl("https://togena.example", "a b")).toBe(
      "https://togena.example/participant/magic-link?token=a+b",
    )
  })
})
