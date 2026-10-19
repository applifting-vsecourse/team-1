import { randomUUID } from "node:crypto"
import { magicLinkCapture } from "@/shared/auth/magic-link/magic-link.shared"
import type { BetterAuth } from "@/shared/auth/providers/better-auth.provider"
import { Inject, Injectable } from "@nestjs/common"

/**
 * Creates a one-time sign-in link (valid 7 days) for a participant account and
 * returns it, without e-mailing it — the caller puts it into its own e-mail
 * (the confirmation e-mail of US-56). Returns `null` when the e-mail has no
 * participant account: nobody else is ever given a link.
 */
/** The one endpoint of the magic-link plugin used here (typed by hand, see the plugin file). */
type MagicLinkApi = {
  signInMagicLink(options: {
    body: { email: string; metadata: Record<string, unknown> }
    headers: Headers
  }): Promise<{ status: boolean }>
}

@Injectable()
export class MagicLinkService {
  constructor(@Inject("BetterAuth") private readonly auth: BetterAuth) {}

  async createLink(email: string): Promise<string | null> {
    const requestId = randomUUID()
    let issued: string | null = null
    magicLinkCapture.expect(requestId, (url) => {
      issued = url
    })
    try {
      await (this.auth.api as unknown as MagicLinkApi).signInMagicLink({
        body: { email, metadata: { requestId } },
        headers: new Headers(),
      })
    } finally {
      magicLinkCapture.forget(requestId)
    }
    return issued
  }
}
