import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { myApplicationQueryOptions } from "@/features/participant/api/applications"
import { ChangeRequestNotice } from "@/features/participant/components/ChangeRequestNotice"
import { OrganizationContact } from "@/features/participant/components/OrganizationContact"
import {
  ParticipantTermActions,
  ParticipantTermChange,
  type ChangeMode,
} from "@/features/participant/components/ParticipantTermChange"
import { PaymentSummary } from "@/features/participant/components/PaymentSummary"
import { RoomSection } from "@/features/participant/components/RoomSection"
import { RoomWishesSection } from "@/features/participant/components/RoomWishes"
import { TermSteps } from "@/features/participant/components/TermSteps"
import { TermStatusBadge } from "@/features/participant/components/TermSummary"

type ApplicationDetailProps = { applicationId: string }

/** One application: the event, the status of every term and, with a confirmed term, the payment details. */
// Figma (Design system): Detail přihlášky · Moje přihlášky (K vyhodnocení) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15751-1721 (360 px: node-id=15751-1784)
// Figma (Design system): U04 Moje přihláška · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11066
// Action placement follows #407; its linked #311 frames cover the payment cards only.
export function ApplicationDetail({ applicationId }: ApplicationDetailProps) {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(myApplicationQueryOptions(applicationId))
  const [changeMode, setChangeMode] = useState<ChangeMode | null>(null)

  const back = <BackLink to={ROUTES.participant.applications}>{t("detail.back")}</BackLink>

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

  const hasToEvaluate = data.terms.some((term) => term.status === "TO_EVALUATE")
  // Confirmed and waitlisted terms are shown with their payment below (US-110).
  const otherTerms = data.terms.filter(
    (term) =>
      term.status === "TO_EVALUATE" || term.status === "CANCELLED" || term.status === "ARCHIVED",
  )

  const hasSteps = data.terms.some((term) => term.status === "CONFIRMED")

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        {back}
        <PageHeader
          hasBand
          motif="forms"
          title={t("detail.title")}
          description={`${data.firstName} ${data.lastName} · ${data.eventName}`}
          actions={
            <Button
              asChild
              variant="outline"
            >
              <Link
                to={ROUTES.participant.editApplication}
                params={{ applicationId }}
              >
                {t("edit.open")}
              </Link>
            </Button>
          }
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <section
          aria-labelledby="application-terms"
          className="flex flex-col gap-6"
        >
          <h2
            id="application-terms"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("detail.sections.terms")}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">{data.code}</p>
          <TermSteps application={data} />
          <ParticipantTermActions
            application={data}
            onStart={setChangeMode}
          />
          {otherTerms.length > 0 ? (
            <Card className="gap-0 p-6">
              <h2 className="pb-4 text-lg font-semibold">{t("detail.termsTitle")}</h2>
              <ul>
                {otherTerms.map((term) => (
                  <li
                    key={term.termId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-4 last:pb-0"
                  >
                    <TermLabel term={term} />
                    <TermStatusBadge term={term} />
                    <span className="w-full sm:w-50 sm:text-right">
                      {term.status === "TO_EVALUATE" ? null : (
                        <>
                          {term.archivedOverpaymentCzk ? `${t("paymentStatus.OVERPAID")} · ` : null}
                          <MoneyAmount amountCzk={term.archivedOverpaymentCzk ?? 0} />
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {hasToEvaluate ? <p className="pt-4">{t("detail.toEvaluate.note")}</p> : null}
            </Card>
          ) : null}
          <ChangeRequestNotice
            applicationId={applicationId}
            terms={data.terms}
          />
          {hasToEvaluate ? (
            // Figma (Design system): Togena / Alert · node-id=15751-1777 (360 px: 15751-1810)
            <Alert>
              <TriangleAlert aria-hidden />
              <AlertTitle>{t("detail.toEvaluate.alertTitle")}</AlertTitle>
              <AlertDescription>{t("detail.toEvaluate.alertText")}</AlertDescription>
            </Alert>
          ) : null}
        </section>
        <aside className="grid min-w-0 gap-4">
          <RoomWishesSection
            applicationId={applicationId}
            terms={data.terms}
          />
          <RoomSection terms={data.terms} />
          {hasSteps ? (
            <div>
              <Button
                asChild
                variant="secondary"
                size="lg"
              >
                <Link
                  to={ROUTES.participant.applicationProgram}
                  params={{ applicationId }}
                >
                  {t("detail.program")}
                </Link>
              </Button>
            </div>
          ) : null}
          {hasSteps ? null : (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                variant="secondary"
                size="lg"
              >
                <Link
                  to={ROUTES.participant.applicationMeals}
                  params={{ applicationId }}
                >
                  {t("detail.meals")}
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="lg"
              >
                <Link
                  to={ROUTES.participant.applicationHealth}
                  params={{ applicationId }}
                >
                  {t("detail.health")}
                </Link>
              </Button>
            </div>
          )}
          <OrganizationContact contact={data.organizationContact} />
        </aside>
      </div>
      <div className="mx-auto w-full max-w-[944px]">
        <PaymentSummary application={data} />
      </div>
      {changeMode ? (
        <ParticipantTermChange
          application={data}
          mode={changeMode}
          onClose={() => setChangeMode(null)}
        />
      ) : null}
    </div>
  )
}
