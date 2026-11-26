import { PostInput } from "@/modules/board/domain/board"

export const POST_TITLE_MAX = 120
export const POST_BODY_MAX = 5000

/**
 * The post as it is stored: both texts trimmed (line breaks inside the body stay), the title at
 * most 120 characters and the body at most 5000, at least one term. Null when it does not fit.
 */
export function normalizePostInput(raw: {
  title?: unknown
  body?: unknown
  termIds?: unknown
}): PostInput | null {
  if (typeof raw.title !== "string" || typeof raw.body !== "string") return null
  if (!Array.isArray(raw.termIds) || raw.termIds.some((id) => typeof id !== "string")) return null
  const title = raw.title.trim()
  const body = raw.body.trim()
  if (title.length < 1 || title.length > POST_TITLE_MAX) return null
  if (body.length < 1 || body.length > POST_BODY_MAX) return null
  return { title, body, termIds: [...new Set(raw.termIds as string[])] }
}

/** Every chosen term belongs to the event and is not cancelled; an empty choice is not valid. */
export function areTermsValid(
  termIds: readonly string[],
  eventTerms: readonly { id: string; isCancelled: boolean }[],
): boolean {
  if (termIds.length === 0) return false
  return termIds.every((id) => eventTerms.some((term) => term.id === id && !term.isCancelled))
}
