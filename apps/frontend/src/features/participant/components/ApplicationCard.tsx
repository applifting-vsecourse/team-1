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
// Figma (Design system v2): US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (360 px: node-id=15649-122)
export function ApplicationCard({ application }: ApplicationCardProps) {
  const { t } = useTranslation("participant")
  return (
    <Link
      to={ROUTES.participant.application}
      params={{ applicationId: application.id }}
      aria-label={`${application.eventName} · ${application.firstName} ${application.lastName} · ${application.code}`}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="relative gap-3 rounded-xl p-4 shadow-none transition-colors hover:bg-accent/40 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,12rem)] md:gap-6 md:pr-14">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-6">
            <h3>
              {application.firstName} {application.lastName}
              {" · "}
              <span className="text-sm text-muted-foreground">{application.code}</span>
            </h3>
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground md:hidden"
            />
          </div>
          <p className="text-sm">
            {[
              application.birthDate && formatDate(application.birthDate),
              application.gender &&
                t(application.gender === "FEMALE" ? "list.female" : "list.male"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div>
            <PaymentStatusBadge status={application.paymentStatus} />
          </div>
        </div>
        {/* Term rows: date and status side by side on a phone, the status under the date on desktop. */}
        <ul className="flex flex-col gap-2 md:gap-4">
          {application.terms.map((term) => (
            <li
              key={term.termId}
              className="flex items-center gap-4 md:flex-col md:items-start md:gap-2"
            >
              <TermLabel term={term} />
              <TermStatusBadge term={term} />
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-1">
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
        <ChevronRight
          aria-hidden
          className="absolute top-5 right-5 hidden size-5 text-muted-foreground md:block"
        />
      </Card>
    </Link>
  )
}
