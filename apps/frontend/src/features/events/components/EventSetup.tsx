import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CARD_GRID_WIDE, CardGrid } from "@/components/molecules/CardGrid"
import { Checklist, type ChecklistItem } from "@/components/molecules/Checklist"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { notify } from "@/lib/notify"

import { eventQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { EvaluationModeStep } from "@/features/events/components/EvaluationModeStep"
import { applicationLink } from "@/features/events/lib/application-link"

/**
 * O04 / O04a / O04b: the event overview under the event header — what is
 * missing before the application link works, or the link itself with its
 * copy button; a toast confirms the copy.
 */
// Figma (Design system): O04a Co chybí ke zpřístupnění přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12264-1440
// Figma (Design system): O04 Připravená akce a odkaz · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12110-156
// Figma (Design system): A1 Přehled akce · Volba režimu v kroku · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26157-1995
// Figma (Design system): A2 Přehled akce · Režim potvrzen · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26158-815
// Figma (Design system): A3 Přehled akce · Volba režimu v kroku · Mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26157-2050
// Figma (Design system): O04b Potvrzení zkopírování odkazu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12265-1107
export function EventSetup({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const { t: tCommon } = useTranslation()
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
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      notify.success(t("overview.copied"))
    } catch {
      notify.error(tCommon("clipboard.failedTitle"), tCommon("clipboard.failedDescription"))
    }
  }

  return (
    <CardGrid>
      {event.applicationsOpen ? (
        <ShareLink
          link={link}
          onCopy={() => void copy()}
        />
      ) : (
        // Full width, as drawn: the mode step holds two side-by-side choices.
        <div className={CARD_GRID_WIDE}>
          <MissingSteps event={event} />
        </div>
      )}
    </CardGrid>
  )
}

function ShareLink({ link, onCopy }: { link: string; onCopy: () => void }) {
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
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={t("overview.copyLink")}
          onClick={onCopy}
        >
          <Copy
            className="size-5"
            aria-hidden="true"
          />
        </Button>
      </div>
    </Card>
  )
}

const STEPS = ["TERM", "ROOM", "EVALUATION_MODE"] as const

function MissingSteps({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const links = {
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

  const item = (step: (typeof STEPS)[number]): ChecklistItem => {
    const isMissing = event.missing.includes(step)
    if (step === "EVALUATION_MODE") {
      // Done: the chosen mode with a way back to the settings, until applications lock it.
      return isMissing
        ? {
            key: step,
            title: t("overview.missing.modeTitle"),
            isDone: false,
            content: (
              <EvaluationModeStep
                eventId={event.id}
                isFirstMissing={step === firstMissing}
              />
            ),
          }
        : {
            key: step,
            title: t("overview.missing.modeDone", {
              mode: t(
                `evaluationMode.${event.evaluationMode === "AUTOMATIC" ? "automatic" : "manual"}`,
              ),
            }),
            isDone: true,
            titleExtra: event.evaluationModeLocked ? null : (
              <>
                <span
                  aria-hidden="true"
                  className="text-sm text-muted-foreground"
                >
                  ·
                </span>
                <Link
                  to={ROUTES.organizer.eventSettings}
                  params={{ eventId: event.id }}
                  className="text-sm font-medium text-link hover:underline"
                >
                  {t("evaluationMode.change")}
                </Link>
              </>
            ),
          }
    }
    return {
      key: step,
      title: links[step].title,
      isDone: !isMissing,
      action: isMissing ? (
        <Button
          asChild
          // One primary action per view: the step to do first.
          variant={step === firstMissing ? "default" : "outline"}
          size="lg"
        >
          <Link
            to={links[step].to}
            params={{ eventId: event.id }}
          >
            {links[step].action}
          </Link>
        </Button>
      ) : null,
    }
  }

  return (
    <Checklist
      title={t("overview.missing.title")}
      progress={t("overview.missing.progress", {
        done: STEPS.length - event.missing.length,
        total: STEPS.length,
      })}
      items={STEPS.map(item)}
    />
  )
}
