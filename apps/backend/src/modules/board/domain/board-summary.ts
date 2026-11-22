import { BoardSummary, ParticipantPost } from "@/modules/board/domain/board"
import { ViewerTerm, visibleTermIds } from "@/modules/board/domain/visibility"

export const EXCERPT_LENGTH = 140

/** The beginning of the text for the list; line breaks collapse so a row stays short. */
export function excerpt(body: string, length = EXCERPT_LENGTH): string {
  const text = body.replace(/\s+/g, " ").trim()
  if (text.length <= length) return text
  return `${text.slice(0, length).trimEnd()}…`
}

/** The number of new posts and the newest one; the posts come newest first. */
export function summarize(
  posts: readonly Pick<ParticipantPost, "id" | "title" | "isNew">[],
  unreadByApplication: BoardSummary["unreadByApplication"] = [],
): BoardSummary {
  return {
    unreadCount: posts.filter((post) => post.isNew).length,
    latest: posts[0] ? { id: posts[0].id, title: posts[0].title } : null,
    unreadByApplication: [...unreadByApplication],
  }
}

/** One application of the account in one term. */
export type ApplicationViewerTerm = ViewerTerm & { applicationId: string }

/**
 * The new posts an application sees: a post counts for the application that is confirmed or a
 * substitute in one of its terms (the same rule as for the whole account, see `visibleTermIds`).
 * Applications without a new post are left out.
 */
export function newPostCounts(
  applicationTerms: readonly ApplicationViewerTerm[],
  posts: readonly { termIds: readonly string[]; isNew: boolean }[],
): BoardSummary["unreadByApplication"] {
  const byApplication = new Map<string, ViewerTerm[]>()
  for (const term of applicationTerms) {
    const terms = byApplication.get(term.applicationId)
    if (terms) terms.push(term)
    else byApplication.set(term.applicationId, [term])
  }
  const result: BoardSummary["unreadByApplication"] = []
  for (const [applicationId, terms] of byApplication) {
    const visible = visibleTermIds(terms)
    const unreadCount = posts.filter(
      (post) => post.isNew && post.termIds.some((id) => visible.has(id)),
    ).length
    if (unreadCount > 0) result.push({ applicationId, unreadCount })
  }
  return result
}
