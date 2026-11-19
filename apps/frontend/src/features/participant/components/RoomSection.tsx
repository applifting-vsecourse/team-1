import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { termLine } from "@/lib/term-label"

import type { MyApplicationTerm } from "@/features/participant/api/applications"

/** The participant's room in every confirmed term whose organizer published the assignment (US-144). */
// Figma (Design system): Potvrzená účast · zveřejněný pokoj · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=24910-2294 (mobile 24910-2435)
// Figma (Design system): Potvrzená účast · zatím bez pokoje · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=24910-2528 (mobile 24910-2663)
// Roommates are not shown until the PO decides full names vs. first names (open question in #504).
export function RoomSection({ terms }: { terms: MyApplicationTerm[] }) {
  const { t } = useTranslation("participant")
  const withRoom = terms.filter((term) => term.room !== undefined)
  if (withRoom.length === 0) return null
  return (
    <section
      aria-labelledby="application-room"
      className="flex flex-col gap-4"
    >
      <h2
        id="application-room"
        className="text-2xl font-semibold tracking-tight"
      >
        {t("detail.sections.room")}
      </h2>
      {withRoom.map((term) => (
        <Card
          key={term.termId}
          className="gap-3 p-4 sm:p-6"
        >
          <p className="text-sm text-muted-foreground">{termLine(term)}</p>
          {term.room?.name ? (
            <>
              <Separator />
              <p className="text-lg font-semibold">{term.room.name}</p>
            </>
          ) : (
            <p>{t("detail.roomNotAssigned")}</p>
          )}
        </Card>
      ))}
    </section>
  )
}
