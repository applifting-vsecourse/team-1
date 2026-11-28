import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import { boardSummaryQueryOptions } from "@/features/board/api/board"

/**
 * The way to the board from an application: the number of new posts and the newest title. An
 * account without a post sees no card.
 */
// Figma (Návrh #91 – Nástěnka): C4 vstup z Moje přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29545-32742
export function BoardEntryCard({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("board")
  const { data } = useQuery(boardSummaryQueryOptions())
  if (!data?.latest) return null
  return (
    <Card
      aria-labelledby="board-entry-title"
      className="gap-3 p-4"
    >
      <div className="flex items-center gap-2">
        <h2
          id="board-entry-title"
          className="flex-1 text-xl font-bold tracking-tight"
        >
          {t("title")}
        </h2>
        {data.unreadCount > 0 ? (
          <Badge variant="neutral">{t("newCount", { count: data.unreadCount })}</Badge>
        ) : null}
      </div>
      <p className="text-sm font-medium break-words">{data.latest.title}</p>
      <Link
        to={ROUTES.participant.board}
        search={{ applicationId }}
        className="w-fit text-sm font-medium text-link"
      >
        {t("showAll")}
      </Link>
    </Card>
  )
}
