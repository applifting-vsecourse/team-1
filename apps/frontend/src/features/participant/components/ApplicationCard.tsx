import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Card } from "@/components/ui/card"

import type { MyApplication } from "@/features/participant/api/applications"
import {
  PaymentStatusBadge,
  TermLabel,
  TermStatusBadge,
} from "@/features/participant/components/TermSummary"

type ApplicationCardProps = { application: MyApplication }

/** One application in the list: event, who and which number, every term with its status. Opens the detail. */
// Figma (Design system): U01 Přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12092-104
export function ApplicationCard({ application }: ApplicationCardProps) {
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-muted-foreground">
            {`${application.firstName} ${application.lastName} · ${application.code}`}
          </p>
          <PaymentStatusBadge status={application.paymentStatus} />
        </div>
        {/* Rows: "U / Term status row" https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219 */}
        <ul className="pt-2">
          {application.terms.map((term) => (
            <li
              key={term.termId}
              className="flex items-center gap-4 border-t py-3 last:pb-0"
            >
              <TermLabel term={term} />
              <TermStatusBadge term={term} />
            </li>
          ))}
        </ul>
      </Card>
    </Link>
  )
}
