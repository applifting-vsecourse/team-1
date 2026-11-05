import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

import {
  stillSkipped,
  substituteHistoryQueryOptions,
} from "@/features/event-overview/api/substituteRecords"

// Figma (Design system): US-105 Přihlášky · Náhradníci · historie · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15781-6016 (mobile 15781-6089)
// History of filled beds of one term under the waitlist: who was confirmed (when, by whom) and,
// only where someone was passed over, who. Figma draws no empty state, so without a record
// nothing is shown.
export function SubstituteHistory({ eventId, term }: { eventId: string; term: { id: string } }) {
  const { t } = useTranslation("eventOverview")
  const { data } = useQuery(substituteHistoryQueryOptions(eventId, term.id))
  if (!data || data.length === 0) return null
  return (
    <section
      aria-label={t("substituteRecord.history")}
      className="flex flex-col gap-3"
    >
      <h2 className="text-lg font-semibold">{t("substituteRecord.history")}</h2>
      {data.map((record) => {
        const skipped = stillSkipped(record)
        return (
          <Card
            key={record.id}
            className="flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-semibold break-words">{record.confirmed.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(record.changedAt)} ·{" "}
                {record.changedByName ?? t("termStatus.system")}
              </p>
              {skipped.length > 0 && (
                <p className="text-sm break-words">
                  {t("substituteRecord.skippedList", {
                    names: skipped.map((person) => person.name).join(", "),
                  })}
                </p>
              )}
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="self-start sm:self-center"
            >
              <Link
                to={ROUTES.organizer.application}
                params={{ eventId, applicationId: record.confirmed.applicationId }}
                aria-label={t("substituteRecord.openDetail", { name: record.confirmed.name })}
              >
                {t("substituteRecord.detail")}
              </Link>
            </Button>
          </Card>
        )
      })}
    </section>
  )
}
