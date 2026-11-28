import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"

/**
 * The applicants a post is for (US-91): confirmed (a debt or an overdue payment keeps the status
 * CONFIRMED, so it never hides a post) and substitutes. A term to evaluate, a cancelled or an
 * archived application sees nothing.
 */
export const BOARD_VISIBLE_STATUSES: readonly ApplicationTermStatus[] = ["CONFIRMED", "WAITLISTED"]

export const isBoardVisibleStatus = (status: ApplicationTermStatus): boolean =>
  BOARD_VISIBLE_STATUSES.includes(status)

/** One application of the account in one term. */
export type ViewerTerm = {
  termId: string
  status: ApplicationTermStatus
  termCancelled: boolean
}

/** The terms the account sees posts for: an active term it is confirmed or a substitute in. */
export function visibleTermIds(viewerTerms: readonly ViewerTerm[]): Set<string> {
  return new Set(
    viewerTerms
      .filter((term) => !term.termCancelled && isBoardVisibleStatus(term.status))
      .map((term) => term.termId),
  )
}

/** A post is seen by the account that is visible in at least one of its terms. */
export function canSeePost(
  viewerTerms: readonly ViewerTerm[],
  postTermIds: readonly string[],
): boolean {
  const visible = visibleTermIds(viewerTerms)
  return postTermIds.some((id) => visible.has(id))
}

/** A row of an application in a term of a new post. */
export type RecipientRow = {
  userId: string | null
  applicationId: string
  applicationCreatedAt: Date
  status: ApplicationTermStatus
}

/**
 * One account is told once, however many children it has in the terms; the notification leads to
 * its newest application. An application without an account has nobody to tell.
 */
export function pickRecipients(
  rows: readonly RecipientRow[],
): { userId: string; applicationId: string }[] {
  const newest = new Map<string, RecipientRow>()
  for (const row of rows) {
    if (!row.userId || !isBoardVisibleStatus(row.status)) continue
    const current = newest.get(row.userId)
    if (!current || row.applicationCreatedAt > current.applicationCreatedAt)
      newest.set(row.userId, row)
  }
  return [...newest.entries()].map(([userId, row]) => ({
    userId,
    applicationId: row.applicationId,
  }))
}
