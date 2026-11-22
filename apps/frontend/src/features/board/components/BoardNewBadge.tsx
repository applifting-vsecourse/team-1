import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import { boardSummaryQueryOptions } from "@/features/board/api/board"

/**
 * The number of new posts of one application in the list of applications; nothing when it has
 * none. The card is a link to the application, where the card of the board leads on.
 */
// Figma (Návrh #91 – Nástěnka): C5 vstup ze seznamu přihlášek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29545-32925
export function BoardNewBadge({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("board")
  const { data } = useQuery(boardSummaryQueryOptions())
  const count = data?.unreadByApplication.find(
    (item) => item.applicationId === applicationId,
  )?.unreadCount
  if (!count) return null
  return <Badge variant="neutral">{t("postsNewCount", { count })}</Badge>
}
