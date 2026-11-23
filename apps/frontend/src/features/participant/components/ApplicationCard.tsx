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
      <Card className="gap-0 rounded-xl p-0 shadow-none transition-colors hover:border-ring hover:bg-accent/40">
        <div className="flex items-start justify-between gap-4 p-4 md:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h3>
              {application.firstName} {application.lastName}
              {" · "}
              <span className="text-sm text-muted-foreground">{application.code}</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              {[
                application.birthDate && formatDate(application.birthDate),
                application.gender &&
                  t(application.gender === "FEMALE" ? "list.female" : "list.male"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <PaymentStatusBadge status={application.paymentStatus} />
            <ChevronRight
              aria-hidden
              className="size-5 text-muted-foreground"
            />
          </div>
        </div>
        <ul className="flex flex-col gap-3 border-t p-4 md:px-6">
          {application.terms.map((term) => (
            <li
              key={term.termId}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
            >
              <TermLabel term={term} />
              <TermStatusBadge term={term} />
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-4 border-t p-4 md:px-6">
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
