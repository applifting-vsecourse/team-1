import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { myApplicationQueryOptions } from "@/features/participant/api/applications"
import { PaymentSummary } from "@/features/participant/components/PaymentSummary"
import { termRange } from "@/features/participant/lib/format"

type ApplicationDetailProps = { applicationId: string }

/** One application: the event, the status of every term and, with a confirmed term, the payment details. */
// Figma (Design system): U04 Moje přihláška · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11066
export function ApplicationDetail({ applicationId }: ApplicationDetailProps) {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(myApplicationQueryOptions(applicationId))

  const back = (
    <Button
      asChild
      variant="outline"
      size="lg"
      className="w-full md:w-60 md:self-start"
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
      <Card className="gap-4 p-6">
        <h2 className="text-lg font-semibold tracking-tight">{t("detail.termsTitle")}</h2>
        <ul className="flex flex-col gap-4">
          {data.terms.map((term) => {
            const isConfirmed = term.status === "CONFIRMED"
            return (
              <li
                key={term.termId}
                className={cn(
                  "flex flex-col gap-4 rounded-lg border p-6",
                  isConfirmed
                    ? "border-status-success bg-status-success-bg"
                    : "border-status-waitlist bg-status-waitlist-bg",
                )}
              >
                <p className="text-lg font-semibold tracking-tight">{termRange(term)}</p>
                <dl
                  className={cn(
                    "grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 border-t pt-4",
                    isConfirmed ? "border-status-success/25" : "border-status-waitlist/25",
                  )}
                >
                  <dt className="text-muted-foreground">{t("detail.status")}</dt>
                  <dd
                    className={cn(
                      "font-semibold",
                      isConfirmed ? "text-status-success" : "text-status-waitlist",
                    )}
                  >
                    {isConfirmed ? t("status.confirmedLong") : t("status.waitlistedLong")}
                  </dd>
                  {isConfirmed ? null : (
                    <>
                      <dt className="text-muted-foreground">{t("detail.position")}</dt>
                      <dd className="font-semibold">
                        {t("status.position", { position: term.waitlistPosition })}
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">{t("detail.toPay")}</dt>
                  <dd className="font-semibold">
                    <MoneyAmount amountCzk={isConfirmed ? term.priceCzk : 0} />
                    {isConfirmed ? null : ` ${t("status.untilConfirmed")}`}
                  </dd>
                </dl>
              </li>
            )
          })}
        </ul>
        {hasWaitlisted ? <p className="text-muted-foreground">{t("detail.waitlistNote")}</p> : null}
      </Card>
      <PaymentSummary application={data} />
    </div>
  )
}
