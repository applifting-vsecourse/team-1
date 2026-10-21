import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

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
      <Card className="gap-2 px-6 py-5 transition-colors hover:bg-accent/40">
        <div className="flex items-center justify-between gap-6">
          <h2 className="text-lg font-semibold">{application.eventName}</h2>
          <span
            aria-hidden
            className="shrink-0 text-lg font-semibold text-link"
          >
            →
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {`${application.firstName} ${application.lastName} · ${application.code} · ${termsOverview(application)}`}
        </p>
        <ul className="flex flex-wrap gap-3 pt-2">
          {application.terms.map((term) => (
            <li key={term.termId}>
              <Badge variant={term.status === "CONFIRMED" ? "success" : "waitlist"}>
                {`${termRangeShort(term)} · ${
                  term.status === "CONFIRMED"
                    ? t("status.confirmed")
                    : t("status.waitlisted", { position: term.waitlistPosition })
                }`}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </Link>
  )
}
