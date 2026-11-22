import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { ListSkeleton } from "@/components/molecules/ListSkeleton"
import { PageHeader } from "@/components/molecules/PageHeader"
import { cn } from "@/lib/utils"

import { boardQueryOptions } from "@/features/board/api/board"
import { BoardPostDetail } from "@/features/board/components/BoardPostDetail"
import { BoardPostList } from "@/features/board/components/BoardPostList"
import { useIsDesktop } from "@/features/board/hooks/use-is-desktop"

/**
 * The applicant's board: every post of the terms the account is confirmed or a substitute in. From
 * `lg` the list and the open post are side by side (the newest one is open at first); on a phone
 * they are two screens, the list and a post with a way back.
 */
// Figma (Návrh #91 – Nástěnka): C1 seznam a detail · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29544-1216
// Figma (Návrh #91 – Nástěnka): C2 seznam · Mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29545-32408
// Figma (Návrh #91 – Nástěnka): C3 detail · Mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29545-32592
export function BoardPage({ postId }: { postId?: string }) {
  const { t } = useTranslation("board")
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const query = useQuery(boardQueryOptions())
  const posts = query.data
  const firstId = posts?.[0]?.id

  useEffect(() => {
    if (isDesktop && !postId && firstId) {
      void navigate({
        to: ROUTES.participant.boardPost,
        params: { postId: firstId },
        replace: true,
      })
    }
  }, [isDesktop, postId, firstId, navigate])

  const events = new Set(posts?.map((post) => post.eventName))
  const eventName = events.size === 1 ? [...events][0] : undefined
  // On a phone an open post is a screen of its own: the heading gives way to the way back.

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <Seo title={t("title")} />
      {postId ? (
        <div className="flex lg:hidden">
          <BackLink to={ROUTES.participant.board}>{t("backToList")}</BackLink>
        </div>
      ) : null}
      <div className={cn("flex flex-col gap-4", postId && "max-lg:hidden")}>
        <BackLink to={ROUTES.participant.applications}>{t("back")}</BackLink>
        <PageHeader
          title={t("title")}
          description={eventName}
        />
      </div>
      {query.isError ? (
        <ErrorState
          title={t("loadFailed")}
          error={query.error}
          onRetry={() => {
            void query.refetch()
          }}
        />
      ) : !posts ? (
        <ListSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className={cn(postId && "max-lg:hidden")}>
            <BoardPostList
              posts={posts}
              selectedId={postId}
              isShowingEvent={events.size > 1}
            />
          </div>
          {postId ? <BoardPostDetail postId={postId} /> : null}
        </div>
      )}
    </div>
  )
}
