import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { eventQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { applicationLink } from "@/features/events/lib/application-link"

/**
 * O04 / O04a / O04b: the event overview under the event header — what is
 * missing before the application link works, or the link itself with its
 * copy button; a toast confirms the copy.
 */
// Figma (Design system): O04a Co chybí ke zpřístupnění přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12264-1440
// Figma (Design system): O04 Připravená akce a odkaz · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12110-156
// Figma (Design system): O04b Potvrzení zkopírování odkazu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12265-1107
export function EventSetup({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const { data: event, isPending, error, refetch } = useQuery(eventQueryOptions(eventId))
  const [isCopied, setIsCopied] = useState(false)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("overview.errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  const link = applicationLink(event.publicToken)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setIsCopied(true)
      toast.success(t("overview.copied"))
    } catch {
      setIsCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("overview.title")}
        description={subtitle(event, t)}
        actions={
          <Button
            size="lg"
            disabled={!event.applicationsOpen}
            onClick={() => void copy()}
          >
            {isCopied ? t("overview.copyAgain") : t("overview.copy")}
          </Button>
        }
      />
      {event.applicationsOpen ? <ShareLink link={link} /> : <MissingSteps event={event} />}
    </div>
  )
}

function subtitle(event: OrganizerEvent, t: ReturnType<typeof useTranslation<"events">>["t"]) {
  return event.termCount > 0
    ? t("overview.subtitleTerms", {
        count: event.termCount,
        name: event.name,
        organization: event.organizationName,
      })
    : t("overview.subtitleNoTerms", {
        name: event.name,
        organization: event.organizationName,
      })
}

function ShareLink({ link }: { link: string }) {
  const { t } = useTranslation("events")

  return (
    <Card className="gap-3 p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t("overview.ready.title")}</h3>
      <p className="text-sm text-muted-foreground">{t("overview.ready.body")}</p>
      <a
        href={link}
        className="break-all text-link hover:underline"
      >
        {link}
      </a>
    </Card>
  )
}

function MissingSteps({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")

  return (
    <>
      <Card className="gap-4 p-6">
        <h3 className="text-lg font-semibold tracking-tight">{t("overview.missing.title")}</h3>
        <p className="text-muted-foreground">{t("overview.missing.intro")}</p>
        {event.missing.includes("TERM") ? (
          <>
            <h4 className="font-semibold">{t("overview.missing.termTitle")}</h4>
            <p className="text-sm">{t("overview.missing.termBody")}</p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="self-start"
            >
              <Link
                to={ROUTES.organizer.eventTerms}
                params={{ eventId: event.id }}
              >
                {t("overview.missing.addTerm")}
              </Link>
            </Button>
          </>
        ) : null}
        {event.missing.includes("ROOM") ? (
          <>
            <h4 className="font-semibold">{t("overview.missing.roomTitle")}</h4>
            <p className="text-sm">{t("overview.missing.roomBody")}</p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="self-start"
            >
              <Link
                to={ROUTES.organizer.eventRooms}
                params={{ eventId: event.id }}
              >
                {t("overview.missing.addRoom")}
              </Link>
            </Button>
          </>
        ) : null}
      </Card>
      <Alert>
        <CircleAlert />
        <AlertTitle>{t("overview.inactiveTitle")}</AlertTitle>
        <AlertDescription>{t("overview.inactiveBody")}</AlertDescription>
      </Alert>
    </>
  )
}
