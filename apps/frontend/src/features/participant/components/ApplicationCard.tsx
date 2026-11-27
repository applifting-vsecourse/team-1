import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { CalendarDays, ChevronRight, UserRound, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"

import type { MyApplication } from "@/features/participant/api/applications"
import { PaymentStatusBadge, TermStatusBadge } from "@/features/participant/components/TermSummary"

type ApplicationCardProps = {
  application: MyApplication
  /** The number of new posts of the board (US-91); a route composes it, as features do not import each other. */
  boardBadge?: ReactNode
}

/** One application in the list: event, who and which number, every term with its status. Opens the detail. */
// Figma (Design system v2): US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (360 px: node-id=15649-122)
// Figma (Návrh #91 – Nástěnka): C5 vstup ze seznamu přihlášek (badge under the data) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/?node-id=29545-32925
export function ApplicationCard({ application, boardBadge }: ApplicationCardProps) {
  const { t } = useTranslation("participant")
  return (
    <Link
      to={ROUTES.participant.application}
      params={{ applicationId: application.id }}
      aria-label={`${application.eventName} · ${application.firstName} ${application.lastName} · ${application.code}`}
      className="block lift rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="gap-0 p-0">
        {/* On a phone the badges go under the participant's data: beside it they would squeeze the name away. */}
        <div className="flex items-start gap-3 p-4 md:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h3
                className="flex items-center gap-2 text-lg font-semibold"
                title={`${application.firstName} ${application.lastName} · ${application.code}`}
              >
                <UserRound
                  aria-hidden
                  className="size-5 shrink-0 text-primary"
                />
                <span className="line-clamp-2 min-w-0 wrap-anywhere">
                  {application.firstName} {application.lastName}
                  {" · "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {application.code}
                  </span>
                </span>
              </h3>
              <p className="pl-7 text-sm text-muted-foreground">
                {[
                  application.birthDate && formatDate(application.birthDate),
                  application.gender &&
                    t(application.gender === "FEMALE" ? "list.female" : "list.male"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="pt-1 pl-7 empty:hidden">{boardBadge}</div>
            </div>
            <div className="shrink-0 pl-7 empty:hidden md:pl-0">
              <PaymentStatusBadge status={application.paymentStatus} />
            </div>
          </div>
          <div className="flex h-7 shrink-0 items-center">
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
              <span className="flex min-w-0 items-center gap-2">
                <CalendarDays
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <TermLabel
                  term={term}
                  isClamped
                />
              </span>
              <TermStatusBadge term={term} />
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-4 border-t p-4 md:px-6">
          <div>
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wallet
                aria-hidden
                className="size-4"
              />
              {t("list.termPrice")}
            </dt>
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
