import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

import { organizerHealthQueryOptions } from "@/features/health/api/health"

/** The participant's health restriction with the time of the explicit consent — organizers only. */
// Figma v2: US-68 Zdravotní omezení poskytnuto · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21218-65048 (mobile 21218-65162, empty 21218-65214 / 21218-65318).
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
      <div className="flex items-start gap-3 md:gap-4">
        <BackLink
          to={ROUTES.organizer.application}
          params={{ eventId, applicationId }}
        >
          {t("backToApplication")}
        </BackLink>
        <div className="min-w-0 flex-1 wrap-anywhere">
          <SectionHeader
            title={t("title")}
            description={`${data.firstName} ${data.lastName} · ${data.eventName}`}
          />
        </div>
      </div>
      <Card className="gap-4 p-4 md:p-6">
        <h3 className="text-xl font-bold tracking-tight md:text-2xl">{t("organizerCardTitle")}</h3>
        {data.note !== null && data.consentAt !== null ? (
          <>
            <p className="break-words whitespace-pre-line">{data.note}</p>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{t("consentGiven")}</p>
              <p>{formatDateTime(data.consentAt)}</p>
            </div>
          </>
        ) : data.noRestriction ? (
          <p>{t("organizerNoRestriction")}</p>
        ) : (
          <>
            <p>{t("notFilled")}</p>
            <p className="text-muted-foreground">{t("notFilledHint")}</p>
          </>
        )}
      </Card>
      <Alert
        role="note"
        className="bg-muted"
      >
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>{t("organizerAccessTitle")}</AlertTitle>
        <AlertDescription>{t("organizerAccessText")}</AlertDescription>
      </Alert>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="self-start"
      >
        <Link
          to={ROUTES.organizer.eventMeals}
          params={{ eventId }}
        >
          {t("goMeals")}
        </Link>
      </Button>
    </div>
  )
}
