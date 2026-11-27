/**
 * The applicant's e-mail of a submitted form, as the applications service stores it. Guards run
 * before validation, so the body can be anything; null when there is no address to count.
 */
export function applicantEmail(body: unknown): string | null {
  const email = (body as { email?: unknown } | null | undefined)?.email
  if (typeof email !== "string") return null
  return email.trim().toLowerCase() || null
}
