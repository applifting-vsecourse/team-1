import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CircleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { eventQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { applicationLink } from "@/features/events/lib/application-link"

/**
 * O04 / O04a / O04b: the head of the event overview — what is missing before
 * the application link works, or the link itself with its copy button.
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
    } catch {
      setIsCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label={t("overview.title")}
        className="text-xs font-medium text-muted-foreground"
      >
        <Link
          to={ROUTES.organizer.events}
          className="hover:underline"
        >
          {t("breadcrumb.events")}
        </Link>{" "}
        / {event.organizationName} / {event.name} / {t("overview.breadcrumbOverview")}
      </nav>
      <PageHeader
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
      {event.applicationsOpen ? (
        <ShareLink
          link={link}
          isCopied={isCopied}
        />
      ) : (
        <MissingSteps event={event} />
      )}
      {!event.applicationsOpen ? (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="self-start"
        >
          <Link to={ROUTES.organizer.events}>{t("overview.backToList")}</Link>
        </Button>
      ) : null}
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

function ShareLink({ link, isCopied }: { link: string; isCopied: boolean }) {
  const { t } = useTranslation("events")

  const content = (
    <>
      <p className="text-sm text-muted-foreground">{t("overview.ready.body")}</p>
      <a
        href={link}
        className="break-all text-link hover:underline"
      >
        {link}
      </a>
    </>
  )

  if (isCopied) {
    return (
      <div
        role="status"
        className="flex flex-col gap-1 rounded-lg border border-status-success bg-status-success-bg px-5 py-4"
      >
        <p className="text-sm font-semibold text-status-success">{t("overview.copied")}</p>
        {content}
      </div>
    )
  }
  return (
    <Card className="gap-4 p-6">
      <h2 className="text-lg font-semibold tracking-tight">{t("overview.ready.title")}</h2>
      {content}
    </Card>
  )
}

function MissingSteps({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")

  return (
    <>
      <Card className="gap-4 p-6">
        <h2 className="text-lg font-semibold tracking-tight">{t("overview.missing.title")}</h2>
        <p className="text-muted-foreground">{t("overview.missing.intro")}</p>
        {event.missing.includes("TERM") ? (
          <>
            <h3 className="text-lg font-semibold tracking-tight">
              {t("overview.missing.termTitle")}
            </h3>
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
            <h3 className="text-lg font-semibold tracking-tight">
              {t("overview.missing.roomTitle")}
            </h3>
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
