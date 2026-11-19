import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CopyButton } from "@/components/atoms/CopyButton"
import { CARD_GRID_WIDE, CardGrid } from "@/components/molecules/CardGrid"
import { Checklist } from "@/components/molecules/Checklist"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
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

  return (
    <CardGrid>
      <p className={`${CARD_GRID_WIDE} text-sm`}>
        <span className="text-muted-foreground">{t("evaluationMode.overviewLabel")}: </span>
        <span className="font-medium">
          {t(`evaluationMode.${event.evaluationMode === "AUTOMATIC" ? "automatic" : "manual"}`)}
        </span>
        {event.evaluationModeLocked ? null : (
          <>
            {" · "}
            <Link
              to={ROUTES.organizer.eventSettings}
              params={{ eventId }}
              className="text-link hover:underline"
            >
              {t("evaluationMode.change")}
            </Link>
          </>
        )}
      </p>
      {event.applicationsOpen ? <ShareLink link={link} /> : <MissingSteps event={event} />}
    </CardGrid>
  )
}

function ShareLink({ link }: { link: string }) {
  const { t } = useTranslation("events")

  return (
    <Card className="gap-3 p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t("overview.ready.title")}</h3>
      <div className="flex items-center gap-2">
        <a
          href={link}
          className="min-w-0 break-all text-link hover:underline"
        >
          {link}
        </a>
        <CopyButton
          value={link}
          label={t("overview.copyLink")}
          successMessage={t("overview.copied")}
          errorMessage={t("overview.copyFailed")}
        />
      </div>
    </Card>
  )
}

const STEPS = ["TERM", "ROOM"] as const

function MissingSteps({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const steps = {
    TERM: {
      title: t("overview.missing.termTitle"),
      action: t("overview.missing.addTerm"),
      to: ROUTES.organizer.eventTerms,
    },
    ROOM: {
      title: t("overview.missing.roomTitle"),
      action: t("overview.missing.addRoom"),
      to: ROUTES.organizer.eventRooms,
    },
  } as const
  const firstMissing = STEPS.find((step) => event.missing.includes(step))

  return (
    <Checklist
      title={t("overview.missing.title")}
      progress={t("overview.missing.progress", {
        done: STEPS.length - event.missing.length,
        total: STEPS.length,
      })}
      items={STEPS.map((step) => {
        const isMissing = event.missing.includes(step)
        return {
          key: step,
          title: steps[step].title,
          isDone: !isMissing,
          action: isMissing ? (
            <Button
              asChild
              // One primary action per view: the step to do first.
              variant={step === firstMissing ? "default" : "outline"}
              size="lg"
            >
              <Link
                to={steps[step].to}
                params={{ eventId: event.id }}
              >
                {steps[step].action}
              </Link>
            </Button>
          ) : null,
        }
      })}
    />
  )
}
