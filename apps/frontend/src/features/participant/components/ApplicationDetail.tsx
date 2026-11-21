import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
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

type ApplicationDetailProps = { applicationId: string }

/** One application: the event, the status of every term and, with a confirmed term, the payment details. */
// Figma (Design system v2): #509 / Dva potvrzené termíny · kroky a dluh · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-14581 (360 px: node-id=24910-14762)
// Figma (Design system v2): #407 / Detail · úkoly a akce u termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-37641 (360 px: node-id=22640-37793)
// Figma (Design system v2): US-102 / Detail přihlášky (K vyhodnocení) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15751-1721 (360 px: node-id=15751-1784)
// Figma (Design system v2): US-54 + US-121 / Detail přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-211 (360 px: node-id=15649-293)
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
      <div className="flex flex-col gap-3">
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
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
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <section
          aria-labelledby="application-terms"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              id="application-terms"
              className="text-2xl font-semibold tracking-tight"
            >
              {t("detail.sections.terms")}
            </h2>
            <p className="text-sm font-medium tabular-nums">{data.code}</p>
          </div>
          <TermSteps application={data} />
          <TermStaySection
            applicationId={applicationId}
            terms={data.terms}
          />
          <ParticipantTermActions
            application={data}
            onStart={setChangeMode}
          />
          {isArchived ? <ArchivedApplicationCard /> : null}
          <ChangeRequestNotice
            applicationId={applicationId}
            terms={data.terms}
          />
        </section>
        <aside className="grid min-w-0 gap-4">
          <RoomSection terms={data.terms} />
          <RoomWishesSection
            applicationId={applicationId}
            terms={data.terms}
          />
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
            <Card className="min-w-0 gap-3 p-4">
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
