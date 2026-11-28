import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"
import { cn } from "@/lib/utils"

import type { ParticipantPostItem } from "@/features/board/api/board"
import { termsLabel } from "@/features/board/lib/post-label"

/**
 * The posts of the account, newest first: a row is a link to the post, the open one is tinted
 * (desktop), a new one carries the „Nové“ badge, and on a phone the chevron says it opens.
 */
// Figma (Návrh #91 – Nástěnka): C1 seznam a detail · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29544-1216
// Figma (Návrh #91 – Nástěnka): C2 seznam · Mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29545-32408
export function BoardPostList({
  posts,
  selectedId,
  applicationId,
  isShowingEvent,
}: {
  posts: ParticipantPostItem[]
  selectedId?: string
  /** Kept in the link, so the way back from a post still leads to the application. */
  applicationId?: string
  /** More events on the board: the name of the event is part of the line above the title. */
  isShowingEvent: boolean
}) {
  const { t } = useTranslation("board")
  return (
    <Card className="gap-0 p-2">
      <ul>
        {posts.map((post, index) => {
          const meta = [
            formatDate(post.createdAt),
            ...(isShowingEvent ? [post.eventName] : []),
            termsLabel(post.terms, post.eventTermCount, t),
          ].join(" · ")
          return (
            <li
              key={post.id}
              className={cn(index > 0 && "border-t border-border")}
            >
              <Link
                to={ROUTES.participant.boardPost}
                params={{ postId: post.id }}
                search={{ applicationId }}
                aria-current={post.id === selectedId ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md p-4 hover:bg-accent/40 aria-[current=page]:bg-accent",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {meta}
                    {post.isNew ? <Badge variant="neutral">{t("new")}</Badge> : null}
                  </span>
                  <span className="font-bold break-words">{post.title}</span>
                  <span className="truncate text-sm text-muted-foreground">{post.excerpt}</span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground lg:hidden"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
