import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { BrandPageHeader } from "@/components/molecules/BrandPageHeader"
import { DetailItem } from "@/components/molecules/DetailItem"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termDatesLine } from "@/lib/term-label"

import { applicationEditQueryOptions } from "@/features/participant/api/applicationEdit"
import { myApplicationQueryOptions } from "@/features/participant/api/applications"
import { ApplicationEditHistory } from "@/features/participant/components/ApplicationEditHistory"
import { ApplicationTasks } from "@/features/participant/components/ApplicationTasks"
import {
  ApplicationTermList,
  ArchivedApplicationCard,
  BeforeEvent,
  isFullyArchived,
} from "@/features/participant/components/ApplicationTermList"
import { ChangeRequestNotice } from "@/features/participant/components/ChangeRequestNotice"
import { OrganizationContact } from "@/features/participant/components/OrganizationContact"
import {
  ParticipantTermActions,
  ParticipantTermChange,
  type ChangeMode,
} from "@/features/participant/components/ParticipantTermChange"
import { RoomSection } from "@/features/participant/components/RoomSection"
import { RoomWishesSection } from "@/features/participant/components/RoomWishes"
import { TermStaySection } from "@/features/participant/components/TermStay"

type ApplicationDetailProps = {
  applicationId: string
  /** The card leading to the board (US-91); a route composes it, as features do not import each other. */
  boardEntry?: ReactNode
}

/**
 * One application, every fact once: who and which event in the head, what is left to do (the debt
 * with the payment details, a transport to choose), the terms with their status and price, the
 * pages to arrange before the event and the organization's contact.
 */
// Figma (Design system v2): #509 / Potvrzená s dluhem a náhradník · co zbývá zařídit · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-14581 (360 px: node-id=24910-14762, paid: 24910-14895)
// Figma (Design system v2): US-102 / Detail přihlášky (K vyhodnocení) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15751-1721 (360 px: node-id=15751-1784)
// Figma (Design system v2): US-54 + US-121 / Detail přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-211 (360 px: node-id=15649-293)
export function ApplicationDetail({ applicationId, boardEntry }: ApplicationDetailProps) {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(myApplicationQueryOptions(applicationId))
  const edit = useQuery({ ...applicationEditQueryOptions(applicationId), enabled: Boolean(data) })
  const [changeMode, setChangeMode] = useState<ChangeMode | null>(null)
  const [editRoomWishesTerm, setEditRoomWishesTerm] = useState<string | null>(null)

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

  // Every term archived: nothing is left to arrange, so no to-do, no „Před akcí“ and no edit button (US-584).
  const isArchived = isFullyArchived(data)
  const { simulatedPayments } = data

  return (
    <div className="flex flex-col gap-8">
      <BrandPageHeader
        back={back}
        title={`${data.firstName} ${data.lastName}`}
        description={t("detail.subtitle", { event: data.eventName, code: data.code })}
        actions={
          isArchived ? null : (
            <Button
              asChild
              variant="outline"
              className="w-55 max-w-full"
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
      <ApplicationTasks application={data} />
      <section
        aria-labelledby="application-terms"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2
            id="application-terms"
            className="flex-1 text-xl font-semibold"
          >
            {t("detail.sections.terms")}
          </h2>
          <ParticipantTermActions
            application={data}
            onStart={setChangeMode}
          />
        </div>
        <ApplicationTermList application={data} />
        {isArchived ? <ArchivedApplicationCard /> : null}
        <ChangeRequestNotice
          applicationId={applicationId}
          terms={data.terms}
        />
        <TermStaySection
          applicationId={applicationId}
          terms={data.terms}
        />
        <RoomSection terms={data.terms} />
        <RoomWishesSection
          applicationId={applicationId}
          terms={data.terms.map((term) => ({
            ...term,
            canDecline: term.noRoomWishes !== true && term.room === undefined,
          }))}
          editingTermId={editRoomWishesTerm}
          onStartEditing={setEditRoomWishesTerm}
          onStopEditing={(termId) =>
            setEditRoomWishesTerm((current) => (current === termId ? null : current))
          }
        />
      </section>
      {isArchived ? null : <BeforeEvent application={data} />}
      {simulatedPayments.length > 0 ? (
        <Card className="gap-2 p-4">
          <h2 className="font-semibold">{t("payment.simulation.logTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("payment.simulation.logDescription")}</p>
          <ul>
            {simulatedPayments.map((payment) => {
              const term = data.terms.find(({ termId }) => termId === payment.termId)
              return (
                <li key={payment.createdAt + payment.termId}>
                  {t("payment.simulation.logLine", {
                    amount: formatCzk(payment.amountCzk),
                    term: term ? termDatesLine(term) : "",
                  })}
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}
      {boardEntry}
      {(Boolean(edit.data?.phone) ||
        data.applicantEmail !== undefined ||
        (data.birthDate !== undefined && data.gender !== undefined)) && (
        <section
          aria-labelledby="application-participant"
          className="flex flex-col gap-3"
        >
          <h2
            id="application-participant"
            className="text-xl font-semibold"
          >
            {t("detail.participantCard")}
          </h2>
          <Card className="gap-3 p-4">
            {data.birthDate && data.gender && (
              <DetailItem label={t("detail.birthGender")}>
                {formatDate(data.birthDate)} ·{" "}
                {t(data.gender === "MALE" ? "detail.male" : "detail.female")}
              </DetailItem>
            )}
            {edit.data?.phone && <DetailItem label={t("edit.phone")}>{edit.data.phone}</DetailItem>}
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
        </section>
      )}
      <OrganizationContact contact={data.organizationContact} />
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
