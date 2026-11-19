import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"

import { applicationEditQueryOptions } from "@/features/participant/api/applicationEdit"
import { myApplicationQueryOptions } from "@/features/participant/api/applications"
import { ApplicationEditHistory } from "@/features/participant/components/ApplicationEditHistory"
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
import { TermStaySection } from "@/features/participant/components/TermStay"
import {
  ArchivedApplicationCard,
  isFullyArchived,
  TermSteps,
} from "@/features/participant/components/TermSteps"
import { TermStatusBadge } from "@/features/participant/components/TermSummary"

type ApplicationDetailProps = { applicationId: string }

/** One application: the event, the status of every term and, with a confirmed term, the payment details. */
// Figma (Design system): Detail přihlášky · Moje přihlášky (K vyhodnocení) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15751-1721 (360 px: node-id=15751-1784)
// Figma (Design system): U04 Moje přihláška · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11066
// Action placement follows #407; its linked #311 frames cover the payment cards only.
export function ApplicationDetail({ applicationId }: ApplicationDetailProps) {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(myApplicationQueryOptions(applicationId))
  const edit = useQuery({ ...applicationEditQueryOptions(applicationId), enabled: Boolean(data) })
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
  // Every term archived: nothing is left to arrange, so no steps, no meals or health links and no edit button (US-584).
  const isArchived = isFullyArchived(data)

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
            isArchived ? null : (
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
            )
          }
        />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <section
          aria-labelledby="application-terms"
          className="flex min-w-0 flex-col gap-6"
        >
          <h2
            id="application-terms"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("detail.sections.terms")}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">{data.code}</p>
          <TermSteps application={data} />
          <TermStaySection
            applicationId={applicationId}
            terms={data.terms}
          />
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
                      {term.status === "TO_EVALUATE" ||
                      (term.status === "ARCHIVED" && !term.archivedOverpaymentCzk) ? null : (
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
          {isArchived ? <ArchivedApplicationCard /> : null}
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
          {hasSteps || isArchived ? null : (
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
          {(Boolean(edit.data?.phone) ||
            data.applicantEmail !== undefined ||
            (data.birthDate !== undefined && data.gender !== undefined)) && (
            <Card className="min-w-0 gap-4 p-4 sm:p-6">
              <h2 className="text-xl font-semibold">{t("detail.participantCard")}</h2>
              {data.birthDate && data.gender && (
                <DetailItem label={t("detail.birthGender")}>
                  {formatDate(data.birthDate)} ·{" "}
                  {t(data.gender === "MALE" ? "detail.male" : "detail.female")}
                </DetailItem>
              )}
              {edit.data?.phone && (
                <DetailItem label={t("edit.phone")}>{edit.data.phone}</DetailItem>
              )}
              {data.applicantEmail && (
                <DetailItem label={t("detail.applicantContact")}>
                  <a
                    className="break-all text-link underline"
                    href={`mailto:${data.applicantEmail}`}
                  >
                    {data.applicantEmail}
                  </a>
                </DetailItem>
              )}
            </Card>
          )}
          <OrganizationContact contact={data.organizationContact} />
        </aside>
      </div>
      <div className="mx-auto w-full max-w-[944px]">
        <PaymentSummary application={data} />
      </div>
      {edit.error ? (
        <ErrorState
          title={t("edit.historyLoadFailed")}
          error={edit.error}
          onRetry={() => void edit.refetch()}
        />
      ) : edit.data?.history.length ? (
        <ApplicationEditHistory saved={edit.data} />
      ) : null}
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
