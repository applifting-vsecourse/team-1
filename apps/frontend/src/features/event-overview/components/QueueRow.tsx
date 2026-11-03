import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDate, formatDateRange, formatTime } from "@/lib/date"

import type { ListedApplication } from "@/features/event-overview/api/applications"

// Figma (Design system): US-107 Přihlášky · Vybrané přihlášky (row with the selection checkbox) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15803-15850 (mobile 15803-16041)
export function QueueRow({
  eventId,
  application,
  termId,
  selection,
  outcome = "TO_EVALUATE",
}: {
  eventId: string
  application: ListedApplication
  termId: string | undefined
  /** Set in the selectable queue (US-107): the checkbox beside the card, not part of its link. */
  selection?: { isSelected: boolean; onChange: (isSelected: boolean) => void }
  /** The status badge: still waiting, or confirmed by a bulk confirmation (US-107). */
  outcome?: "TO_EVALUATE" | "CONFIRMED"
}) {
  const { t } = useTranslation("eventOverview")
  const waiting = application.terms.filter(
    (term) => term.status === "TO_EVALUATE" && (!termId || term.id === termId),
  )
  const name = `${application.firstName} ${application.lastName}`
  return (
    <div className="relative">
      {selection && (
        <div className="absolute top-3.5 left-1.5 z-10 flex size-11 items-center justify-center md:top-3.5">
          <Checkbox
            className="size-6 rounded-md"
            checked={selection.isSelected}
            aria-label={t("bulk.selectRow", { name })}
            onCheckedChange={(checked) => selection.onChange(checked === true)}
          />
        </div>
      )}
      <Link
        to={ROUTES.organizer.application}
        params={{ eventId, applicationId: application.id }}
        aria-label={`${t("queue.detail")}: ${name}`}
        className={`group relative flex flex-col gap-4 rounded-lg border bg-card p-4 pr-14 shadow-sm transition-colors outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-ring md:grid md:grid-cols-[13rem_1fr] md:gap-4 ${selection ? "pt-17 md:pt-4 md:pl-18" : ""}`}
      >
        <div className="flex flex-col gap-2">
          <p>{name}</p>
          <div className="hidden flex-col gap-2 text-sm md:flex">
            <p>
              {formatDate(application.birthDate)} ·{" "}
              {t(application.gender === "FEMALE" ? "applications.female" : "applications.male")}
            </p>
            <p className="wrap-anywhere">{application.email}</p>
            <p>
              {t("queue.received", {
                date: formatDate(application.submittedAt),
                time: formatTime(application.submittedAt),
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:gap-4">
          {waiting.map((term) => (
            <div
              key={term.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-col md:items-start md:gap-2"
            >
              <span>{formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}</span>
              <Badge variant="secondary">
                {t(outcome === "CONFIRMED" ? "bulk.statusConfirmed" : "queue.status")}
              </Badge>
            </div>
          ))}
        </div>
        <ChevronRight
          aria-hidden="true"
          className={`absolute right-4 size-5 text-muted-foreground transition-colors group-hover:text-foreground ${selection ? "top-[70px] md:top-4" : "top-4"}`}
        />
      </Link>
    </div>
  )
}
