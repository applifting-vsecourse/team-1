import { BoardSummary, ParticipantPost } from "@/modules/board/domain/board"

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
): BoardSummary {
  return {
    unreadCount: posts.filter((post) => post.isNew).length,
    latest: posts[0] ? { id: posts[0].id, title: posts[0].title } : null,
  }
}
