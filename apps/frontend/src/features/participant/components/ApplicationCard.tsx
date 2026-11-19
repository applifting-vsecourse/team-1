import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"

import type { MyApplication } from "@/features/participant/api/applications"
import { PaymentStatusBadge, TermStatusBadge } from "@/features/participant/components/TermSummary"

type ApplicationCardProps = { application: MyApplication }

/** One application in the list: event, who and which number, every term with its status. Opens the detail. */
// Figma v2: US-54 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (mobile 15649-122).
export function ApplicationCard({ application }: ApplicationCardProps) {
  const { t } = useTranslation("participant")
  return (
    <Link
      to={ROUTES.participant.application}
      params={{ applicationId: application.id }}
      aria-label={`${application.eventName} · ${application.firstName} ${application.lastName} · ${application.code}`}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="gap-3 rounded-xl p-4 shadow-none transition-colors hover:bg-accent/40">
        <div className="flex items-center justify-between gap-6">
          <h3 className="text-lg font-semibold">
            {application.firstName} {application.lastName}
            {" · "}
            <span className="text-sm font-normal text-muted-foreground">{application.code}</span>
          </h3>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-muted-foreground">
            {[
              application.birthDate && formatDate(application.birthDate),
              application.gender &&
                t(application.gender === "FEMALE" ? "list.female" : "list.male"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <PaymentStatusBadge status={application.paymentStatus} />
        </div>
        {/* Rows: "U / Term status row" https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219 */}
        <ul className="pt-2">
          {application.terms.map((term) => (
            <li
              key={term.termId}
              className="flex items-center gap-4 py-1"
            >
              <TermLabel term={term} />
              <TermStatusBadge term={term} />
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-sm text-muted-foreground">{t("list.termPrice")}</dt>
            <dd>
              <MoneyAmount amountCzk={application.amountDueCzk} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("list.remaining")}</dt>
            <dd>
              {application.paymentDetails ? (
                <MoneyAmount amountCzk={application.paymentDetails.summary.payableCzk} />
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </Card>
    </Link>
  )
}
