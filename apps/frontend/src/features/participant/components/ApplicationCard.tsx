import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { MyApplication } from "@/features/participant/api/applications"
import { termRangeShort, termsOverview } from "@/features/participant/lib/format"

type ApplicationCardProps = { application: MyApplication }

/** One application in the list: event, who and which number, terms and their status. Opens the detail. */
// Figma (Design system): U01 Přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12092-104
export function ApplicationCard({ application }: ApplicationCardProps) {
  const { t } = useTranslation("participant")

  return (
    <Link
      to={ROUTES.participant.application}
      params={{ applicationId: application.id }}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="gap-5 p-6 transition-colors hover:bg-accent/40">
        <div className="flex items-center justify-between gap-6">
          <h2 className="text-2xl font-semibold tracking-tight">{application.eventName}</h2>
          <span
            aria-hidden
            className="shrink-0 text-2xl font-semibold text-link"
          >
            →
          </span>
        </div>
        <div className="text-muted-foreground">
          <p>
            {application.firstName} {application.lastName} · {application.code}
          </p>
          <p>{termsOverview(application)}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {application.terms.map((term) => (
            <li
              key={term.termId}
              className={cn(
                "font-medium",
                term.status === "CONFIRMED" ? "text-status-success" : "text-status-waitlist",
              )}
            >
              {termRangeShort(term)} ·{" "}
              {term.status === "CONFIRMED"
                ? t("status.confirmed")
                : t("status.waitlisted", { position: term.waitlistPosition })}
            </li>
          ))}
        </ul>
      </Card>
    </Link>
  )
}
