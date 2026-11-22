import { useTranslation } from "react-i18next"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { termLine } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import type { MyApplicationTerm } from "@/features/participant/api/applications"

/** The participant's room in every confirmed term whose organizer published the assignment (US-144). */
// Figma (Design system v2): #504 / Potvrzená účast · zveřejněný pokoj · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-2294 (360 px: node-id=24910-2435)
// Figma (Design system v2): #504 / Potvrzená účast · zatím bez pokoje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-2528 (360 px: node-id=24910-2663)
// Figma (Design system v2): #580 Varianta C · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27183-171984 (sám: 27183-172099)
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
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-lg font-bold break-words">{term.room.name}</p>
                {term.room.occupancy ? (
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {t("detail.roomOccupancy", {
                      occupied: term.room.occupancy.occupants.length,
                      count: term.room.occupancy.beds,
                    })}
                  </p>
                ) : null}
              </div>
              {term.room.occupancy ? <RoomBeds occupancy={term.room.occupancy} /> : null}
            </>
          ) : (
            <p>{t("detail.roomNotAssigned")}</p>
          )}
        </Card>
      ))}
    </>
  )
}

type Occupancy = NonNullable<NonNullable<MyApplicationTerm["room"]>["occupancy"]>

// Room capacity has no product upper limit; keep the vacant rows bounded.
const MAX_VISIBLE_VACANCIES = 20

function RoomBeds({ occupancy }: { occupancy: Occupancy }) {
  const { t } = useTranslation("participant")
  const vacancies = Math.max(0, occupancy.beds - occupancy.occupants.length)
  const visibleVacancies = Math.min(vacancies, MAX_VISIBLE_VACANCIES)
  return (
    <>
      <ul
        aria-label={t("detail.roomBeds")}
        className="flex flex-wrap gap-x-2 gap-y-3"
      >
        {occupancy.occupants.map((occupant, index) => (
          <li
            key={index}
            className="flex w-13 flex-col items-center gap-1 text-center"
          >
            <Avatar
              aria-hidden
              className={cn("size-12", occupant.isSelf && "border-2 border-primary")}
            >
              <AvatarFallback className="bg-accent text-sm font-medium text-link">
                {occupant.initials}
              </AvatarFallback>
            </Avatar>
            <span className={cn("w-full text-xs break-words", occupant.isSelf && "font-bold")}>
              {occupant.firstName}
              {occupant.isSelf ? <span className="sr-only"> {t("detail.roomSelf")}</span> : null}
            </span>
          </li>
        ))}
        {Array.from({ length: visibleVacancies }, (_, index) => (
          <li
            key={`vacant-${index}`}
            className="flex w-13 flex-col items-center gap-1 text-center"
          >
            <span
              aria-hidden
              className="size-12 rounded-full border border-dashed border-field-border"
            />
            <span className="text-xs text-muted-foreground">{t("detail.roomVacant")}</span>
          </li>
        ))}
      </ul>
      {vacancies > visibleVacancies ? (
        <p className="text-sm text-muted-foreground">
          {t("detail.roomMoreVacant", { count: vacancies - visibleVacancies })}
        </p>
      ) : null}
    </>
  )
}
