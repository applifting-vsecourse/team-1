import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { myApplicationQueryOptions } from "@/features/participant/api/applications"
import { PaymentSummary } from "@/features/participant/components/PaymentSummary"
import { TermStatusBadge } from "@/features/participant/components/TermSummary"

type ApplicationDetailProps = { applicationId: string }

/** One application: the event, the status of every term and, with a confirmed term, the payment details. */
// Figma (Design system): U04 Moje přihláška · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11066
export function ApplicationDetail({ applicationId }: ApplicationDetailProps) {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(myApplicationQueryOptions(applicationId))

  // Figma DS / Button Style=Quiet, aligned with the page title (no left padding).
  const back = (
    <Button
      asChild
      variant="ghost"
      size="lg"
      className="self-start px-0 hover:bg-transparent hover:underline dark:hover:bg-transparent"
    >
      <Link to={ROUTES.participant.applications}>{t("detail.back")}</Link>
    </Button>
  )

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <ErrorState
          title={t("detail.errorTitle")}
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const hasWaitlisted = data.terms.some((term) => term.status === "WAITLISTED")

  return (
    <div className="flex flex-col gap-6">
      {back}
      <PageHeader
        title={data.eventName}
        description={`${data.firstName} ${data.lastName} · ${data.code}`}
      />
      <Card className="gap-0 p-6">
        <h2 className="pb-4 text-lg font-semibold">{t("detail.termsTitle")}</h2>
        <ul>
          {data.terms.map((term) => {
            const isConfirmed = term.status === "CONFIRMED"
            return (
              <li
                key={term.termId}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-4 last:pb-0"
              >
                <TermLabel term={term} />
                <TermStatusBadge term={term} />
                <span className="w-full sm:w-50 sm:text-right">
                  <MoneyAmount amountCzk={isConfirmed ? term.priceCzk : 0} />
                  {isConfirmed || term.status === "CANCELLED"
                    ? null
                    : ` ${t("status.untilConfirmed")}`}
                </span>
              </li>
            )
          })}
        </ul>
        {hasWaitlisted ? (
          <p className="pt-4 text-sm text-muted-foreground">{t("detail.waitlistNote")}</p>
        ) : null}
      </Card>
      <PaymentSummary application={data} />
    </div>
  )
}
