/* Pure parts of the magic link — kept apart from the plugin so unit tests don't load the e-mail templates. */

/** Magic links are valid for 7 days (docs/PROJEKT.md, section 9). */
export const MAGIC_LINK_TTL_SECONDS = 7 * 24 * 60 * 60

/**
 * Hands the link to whoever asked for it instead of e-mailing it: the
 * confirmation e-mail (US-56) embeds the link itself. `null` means "no link
 * issued" (not a participant account).
 */
type LinkListener = (url: string | null) => void
const listeners = new Map<string, LinkListener>()

export const magicLinkCapture = {
  expect(requestId: string, listener: LinkListener): void {
    listeners.set(requestId, listener)
  },
  forget(requestId: string): void {
    listeners.delete(requestId)
  },
  /** Gives the result to the waiting caller; false when nobody waits (e-mail it instead). */
  publish(requestId: string | null, url: string | null): boolean {
    const listener = requestId ? listeners.get(requestId) : undefined
    listener?.(url)
    return listener !== undefined
  },
}

/** The link goes to a page of the frontend, not straight to the verify endpoint:
 * mail scanners open links with GET and would burn the one-time token before
 * the participant clicks. The page asks for the verify call after a click. */
export const magicLinkLandingUrl = (frontendUrl: string, token: string): string => {
  const url = new URL(`${frontendUrl}/participant/magic-link`)
  url.searchParams.set("token", token)
  return url.toString()
}
