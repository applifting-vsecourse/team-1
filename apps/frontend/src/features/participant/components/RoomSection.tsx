import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { termLine } from "@/lib/term-label"

import type { MyApplicationTerm } from "@/features/participant/api/applications"

/** The participant's room in every confirmed term whose organizer published the assignment (US-144). */
// Figma (Design system v2): #504 / Potvrzená účast · zveřejněný pokoj · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-2294 (360 px: node-id=24910-2435)
// Figma (Design system v2): #504 / Potvrzená účast · zatím bez pokoje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-2528 (360 px: node-id=24910-2663)
// Roommates are not shown until the PO decides full names vs. first names (open question in #504).
export function RoomSection({ terms }: { terms: MyApplicationTerm[] }) {
  const { t } = useTranslation("participant")
  const withRoom = terms.filter((term) => term.room !== undefined)
  if (withRoom.length === 0) return null
  return (
    <>
      {withRoom.map((term) => (
        <Card
          key={term.termId}
          id={`room-${term.termId}`}
          aria-labelledby={`room-title-${term.termId}`}
          className="gap-3 p-4"
        >
          <h2
            id={`room-title-${term.termId}`}
            className="text-xl font-bold tracking-tight"
          >
            {t("detail.sections.room")}
          </h2>
          <p className="text-sm text-muted-foreground">{termLine(term)}</p>
          <Separator />
          {term.room?.name ? (
            <p className="text-lg font-bold">{term.room.name}</p>
          ) : (
            <p>{t("detail.roomNotAssigned")}</p>
          )}
        </Card>
      ))}
    </>
  )
}
