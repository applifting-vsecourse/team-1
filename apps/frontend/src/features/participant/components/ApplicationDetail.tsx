import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Checklist } from "@/components/molecules/Checklist"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { termTitle } from "@/lib/term-label"

import { myApplicationQueryOptions } from "@/features/participant/api/applications"
import { ChangeRequestNotice } from "@/features/participant/components/ChangeRequestNotice"
import { OrganizationContact } from "@/features/participant/components/OrganizationContact"
import {
  ParticipantTermActions,
  ParticipantTermChange,
  type ChangeMode,
} from "@/features/participant/components/ParticipantTermChange"
import { PaymentSummary } from "@/features/participant/components/PaymentSummary"
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

  const hasToEvaluate = data.terms.some((term) => term.status === "TO_EVALUATE")
  // Confirmed and waitlisted terms are shown with their payment below (US-110).
  const otherTerms = data.terms.filter(
    (term) => term.status === "TO_EVALUATE" || term.status === "CANCELLED",
  )

  // Transport is asked for every confirmed term the organizer offers it to.
  const transportTerms = data.terms.filter(
    (term) => term.status === "CONFIRMED" && term.transportOffered,
  )
  const transportOpen = transportTerms.filter((term) => !term.transportDecided).length
  const transportLink = (isOpen: boolean) => (
    <Button
      asChild
      variant={isOpen ? "default" : "outline"}
      size="lg"
    >
      <Link
        to={ROUTES.participant.applicationTransport}
        params={{ applicationId }}
      >
        {t(isOpen ? "detail.todo.choose" : "detail.todo.change")}
      </Link>
    </Button>
  )

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        {back}
        <PageHeader
          title={data.eventName}
          description={`${data.firstName} ${data.lastName} · ${data.code}`}
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
      {transportOpen > 0 ? (
        <Checklist
          title={t("detail.todo.title")}
          intro={t("detail.todo.intro")}
          progress={t("detail.todo.progress", {
            done: transportTerms.length - transportOpen,
            total: transportTerms.length,
          })}
          items={transportTerms.map((term) => ({
            key: term.termId,
            title: t("detail.todo.transportTitle", { term: termTitle(term) }),
            body: t("detail.todo.transportBody"),
            isDone: term.transportDecided,
            statusLabel: t(
              term.transportDecided ? "detail.todo.statusDone" : "detail.todo.statusOpen",
            ),
          }))}
        />
      ) : null}
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
                    {term.status === "TO_EVALUATE" ? null : <MoneyAmount amountCzk={0} />}
                  </span>
                </li>
              ))}
            </ul>
            {hasToEvaluate ? <p className="pt-4">{t("detail.toEvaluate.note")}</p> : null}
          </Card>
        ) : null}
        <ChangeRequestNotice applicationId={applicationId} />
        {hasToEvaluate ? (
          // Figma (Design system): Togena / Alert · node-id=15751-1777 (360 px: 15751-1810)
          <Alert>
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("detail.toEvaluate.alertTitle")}</AlertTitle>
            <AlertDescription>{t("detail.toEvaluate.alertText")}</AlertDescription>
          </Alert>
        ) : null}
        <PaymentSummary application={data} />
      </section>
      {transportTerms.length > 0 ? (
        <section
          aria-labelledby="application-transport"
          className="flex flex-col gap-4"
        >
          <h2
            id="application-transport"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("detail.sections.transport")}
          </h2>
          <Card className="gap-4 p-6">
            <p>{t("detail.transportIntro")}</p>
            <div>{transportLink(transportOpen > 0)}</div>
          </Card>
        </section>
      ) : null}
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
      <OrganizationContact contact={data.organizationContact} />
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
