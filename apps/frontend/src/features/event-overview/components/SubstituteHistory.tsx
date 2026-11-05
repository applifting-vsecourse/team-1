import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { substituteHistoryQueryOptions } from "@/features/event-overview/api/substituteRecords"
import { SubstituteRecordCard } from "@/features/event-overview/components/SubstituteRecordCard"

// Figma (Design system): US-105 Přihlášky · Náhradníci · historie · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15781-6016 (mobile 15781-6089)
// History of filled beds of one term under the waitlist: who was confirmed and who was skipped.
// Figma draws no empty state, so without a record nothing is shown.
export function SubstituteHistory({
  eventId,
  term,
}: {
  eventId: string
  term: { id: string; startsOn: string; endsOn: string }
}) {
  const { t } = useTranslation("eventOverview")
  const { data } = useQuery(substituteHistoryQueryOptions(eventId, term.id))
  if (!data || data.length === 0) return null
  return (
    <section
      aria-label={t("substituteRecord.history")}
      className="flex flex-col gap-6"
    >
      <p>{t("substituteRecord.intro")}</p>
      {data.map((record) => (
        <div
          key={record.id}
          className="flex flex-col gap-6"
        >
          <SubstituteRecordCard
            record={record}
            term={term}
          />
          <Button
            asChild
            variant="ghost"
            className="h-12 w-full"
          >
            <Link
              to={ROUTES.organizer.application}
              params={{ eventId, applicationId: record.confirmed.applicationId }}
            >
              {t("substituteRecord.openDetail", { name: record.confirmed.name })}
            </Link>
          </Button>
        </div>
      ))}
    </section>
  )
}
