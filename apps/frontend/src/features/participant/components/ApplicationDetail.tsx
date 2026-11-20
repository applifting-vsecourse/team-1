import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"

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
import { TermStaySection } from "@/features/participant/components/TermStay"
import {
  ArchivedApplicationCard,
  isFullyArchived,
  TermSteps,
} from "@/features/participant/components/TermSteps"

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

  const hasSteps = data.terms.some((term) => term.status === "CONFIRMED")
  // Every term archived: nothing is left to arrange, so no steps, no meals or health links and no edit button (US-584).
  const isArchived = isFullyArchived(data)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        {back}
        <PageHeader
          title={data.eventName}
          description={`${data.firstName} ${data.lastName} · ${data.code}`}
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
        <TermSteps application={data} />
        <ParticipantTermActions
          application={data}
          onStart={setChangeMode}
        />
        {isArchived ? <ArchivedApplicationCard /> : null}
        <ChangeRequestNotice
          applicationId={applicationId}
          terms={data.terms}
        />
        <PaymentSummary application={data} />
      </section>
      <RoomWishesSection
        applicationId={applicationId}
        terms={data.terms}
      />
      <TermStaySection
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
