import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

import { organizerHealthQueryOptions } from "@/features/health/api/health"

/** The participant's health restriction with the time of the explicit consent — organizers only. */
// Figma v2: US-68 / Organizer health detail · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=21218-65048 (mobile 21218-65162, empty 21218-65214 / 21218-65318).
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
        ) : data.noRestriction ? (
          <p>{t("organizerNoRestriction")}</p>
        ) : (
          <p>{t("notFilled")}</p>
        )}
        <Alert role="note">
          <Info aria-hidden="true" />
          <AlertTitle>{t("organizerAccessTitle")}</AlertTitle>
          <AlertDescription>{t("organizerAccessText")}</AlertDescription>
        </Alert>
        <Button
          asChild
          variant="ghost"
          className="self-start"
        >
          <Link
            to={ROUTES.organizer.eventMeals}
            params={{ eventId }}
          >
            {t("goMeals")}
          </Link>
        </Button>
      </Card>
    </div>
  )
}
