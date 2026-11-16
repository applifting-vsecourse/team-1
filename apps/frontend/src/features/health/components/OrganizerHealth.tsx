import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

import { organizerHealthQueryOptions } from "@/features/health/api/health"

/** The participant's health restriction with the time of the explicit consent — organizers only. */
// Figma (Design system): #68 / Zdravotní omezení · Adam Dvořák · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13718 (360 px: node-id=19795-13852)
export function OrganizerHealth({
  eventId,
  applicationId,
}: {
  eventId: string
  applicationId: string
}) {
  const { t } = useTranslation("health")
  const { data, isPending, error, refetch } = useQuery(organizerHealthQueryOptions(applicationId))

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink
        to={ROUTES.organizer.application}
        params={{ eventId, applicationId }}
      >
        {t("backToApplication")}
      </BackLink>
      <PageHeader title={t("organizerTitle", { name: `${data.firstName} ${data.lastName}` })} />
      <Card className="gap-4 p-4 shadow-none">
        <h2 className="text-2xl font-bold">{t("organizerCardTitle")}</h2>
        {data.note !== null && data.consentAt !== null ? (
          <>
            <p className="break-words whitespace-pre-line">{data.note}</p>
            <p>{t("consentGiven", { at: formatDateTime(data.consentAt) })}</p>
          </>
        ) : (
          <p>{t("notFilled")}</p>
        )}
      </Card>
    </div>
  )
}
