import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CircleAlert, Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Checklist } from "@/components/molecules/Checklist"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { notify } from "@/lib/notify"

import { eventQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { DeleteEventDialog } from "@/features/events/components/DeleteEventDialog"
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
  const { t: tCommon } = useTranslation()
  const { data: event, isPending, error, refetch } = useQuery(eventQueryOptions(eventId))
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("overview.title")}
        description={subtitle(event, t)}
      />
      <p className="text-sm">
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
      {event.applicationsOpen ? (
        <ShareLink
          link={link}
          onCopy={() => void copy()}
        />
      ) : (
        <MissingSteps event={event} />
      )}
      <div className="flex flex-col items-start gap-2 border-t pt-6">
        <p className="text-sm text-muted-foreground">{t("delete.hint")}</p>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsDeleteOpen(true)}
        >
          {t("delete.action")}
        </Button>
      </div>
      {isDeleteOpen ? (
        <DeleteEventDialog
          event={event}
          onClose={() => setIsDeleteOpen(false)}
        />
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

function ShareLink({ link, onCopy }: { link: string; onCopy: () => void }) {
  const { t } = useTranslation("events")

  return (
    <Card className="gap-3 p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t("overview.ready.title")}</h3>
      <p className="text-sm text-muted-foreground">{t("overview.ready.body")}</p>
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

const STEPS = ["TERM", "ROOM"] as const

function MissingSteps({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const steps = {
    TERM: {
      title: t("overview.missing.termTitle"),
      body: t("overview.missing.termBody"),
      action: t("overview.missing.addTerm"),
      to: ROUTES.organizer.eventTerms,
    },
    ROOM: {
      title: t("overview.missing.roomTitle"),
      body: t("overview.missing.roomBody"),
      action: t("overview.missing.addRoom"),
      to: ROUTES.organizer.eventRooms,
    },
  } as const
  const firstMissing = STEPS.find((step) => event.missing.includes(step))

  return (
    <>
      <Checklist
        title={t("overview.missing.title")}
        intro={t("overview.missing.intro")}
        progress={t("overview.missing.progress", {
          done: STEPS.length - event.missing.length,
          total: STEPS.length,
        })}
        items={STEPS.map((step) => {
          const isMissing = event.missing.includes(step)
          return {
            key: step,
            title: steps[step].title,
            body: steps[step].body,
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
      <Alert>
        <CircleAlert />
        <AlertTitle>{t("overview.inactiveTitle")}</AlertTitle>
        <AlertDescription>{t("overview.inactiveBody")}</AlertDescription>
      </Alert>
    </>
  )
}
