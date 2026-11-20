import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Check, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { CopyButton } from "@/components/atoms/CopyButton"
import { CARD_GRID_WIDE, CardGrid } from "@/components/molecules/CardGrid"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { eventQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { applicationLink } from "@/features/events/lib/application-link"

/**
 * The event overview under the event header: the evaluation mode, then either the steps still
 * missing before the application link works (US-12 stepper) or the link itself with its copy
 * button; a toast confirms the copy.
 */
// Figma v2: US-12 Přehled akce · Další kroky ke zpřístupnění · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15398-536 (mobile 15398-598)
// Figma v2: US-12 Přehled akce · 1/3 hotovo · Doplnit kapacitu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18658-20426 (mobile 18658-20548)
// Figma v2: US-13 Přehled akce · Termíny, ceny a sdílení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15409-10508 (mobile 15409-10575)
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
  const headingId = useId()

  return (
    <Card className={`${CARD_GRID_WIDE} gap-3 p-6`}>
      <h2
        id={headingId}
        className="text-xl font-semibold tracking-tight"
      >
        {t("overview.ready.title")}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          readOnly
          aria-labelledby={headingId}
          value={link.replace(/^https?:\/\//, "")}
          className="min-w-0 flex-1 basis-60"
          onFocus={(event) => event.currentTarget.select()}
        />
        <CopyButton
          value={link}
          label={t("overview.copyLink")}
          successMessage={t("overview.copied")}
          errorMessage={t("overview.copyFailed")}
        />
        <Button
          asChild
          variant="ghost"
        >
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            {t("overview.openPage")}
            <ArrowUpRight aria-hidden />
          </a>
        </Button>
      </div>
    </Card>
  )
}

const STEPS = ["TERM", "ROOM"] as const
type Step = (typeof STEPS)[number]

/**
 * What is left before the link works, as the US-12 stepper: the step chips, how far it is, and
 * each step as "Teď" (with the one primary action), "Potom" or done. The event's own steps are a
 * term with a price and the rooms; the bank account the frame adds as a third step is already
 * required when the organization is set up (D-126), so it is not a step here.
 */
function MissingSteps({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const current = STEPS.find((step) => event.missing.includes(step)) ?? "ROOM"
  const done = STEPS.filter((step) => !event.missing.includes(step)).length
  const steps = {
    TERM: {
      tab: t("overview.setup.termTab"),
      title: t("overview.setup.termStep"),
      now: t("overview.setup.termNow"),
      later: t("overview.setup.termNow"),
      done: t("overview.setup.termDone"),
      action: t("overview.setup.addTerm"),
      to: ROUTES.organizer.eventTerms,
    },
    ROOM: {
      tab: t("overview.setup.roomStep"),
      title: t("overview.setup.roomStep"),
      now: t("overview.setup.roomNow"),
      later: t("overview.setup.roomLater"),
      done: null,
      action: t("overview.setup.setCapacity"),
      to: ROUTES.organizer.eventRooms,
    },
  } as const satisfies Record<Step, unknown>
  const isFirstStep = current === "TERM"

  return (
    <>
      <Alert className={CARD_GRID_WIDE}>
        <TriangleAlert aria-hidden />
        <AlertTitle>
          {t(isFirstStep ? "overview.setup.createdTitle" : "overview.setup.termSavedTitle")}
        </AlertTitle>
        <AlertDescription>
          {t(isFirstStep ? "overview.setup.createdBody" : "overview.setup.termSavedBody")}
        </AlertDescription>
      </Alert>
      <Card className={`${CARD_GRID_WIDE} gap-4 p-6`}>
        <ol
          aria-label={t("overview.setup.steps")}
          className="flex flex-wrap gap-2"
        >
          {STEPS.map((step) => {
            const isDone = !event.missing.includes(step)
            const isCurrent = step === current
            return (
              <li
                key={step}
                data-status={isCurrent ? "active" : undefined}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group relative flex items-center gap-1 rounded-md px-3 py-2 text-sm",
                  isCurrent ? "bg-accent font-semibold" : "text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check
                    aria-hidden
                    className="size-4"
                  />
                ) : null}
                {steps[step].tab}
                <ActiveCorners />
              </li>
            )
          })}
        </ol>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {t(`overview.setup.heading${current}`, { done, total: STEPS.length })}
          </h2>
          <p className="text-sm">{t(`overview.setup.intro${current}`)}</p>
        </div>
        <ul className="flex flex-col gap-4">
          {STEPS.map((step) => {
            const isDone = !event.missing.includes(step)
            const isCurrent = step === current
            const { title, now, later, done: doneText, action, to } = steps[step]
            return (
              <li
                key={step}
                className="flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="text-sm font-normal text-muted-foreground">
                    {isDone
                      ? title
                      : t(isCurrent ? "overview.setup.now" : "overview.setup.later", {
                          step: title,
                        })}
                  </h3>
                  {isDone ? doneText ? <p>{doneText}</p> : null : <p>{isCurrent ? now : later}</p>}
                  {isCurrent ? (
                    <Button
                      asChild
                      size="lg"
                      className="mt-2 self-start"
                    >
                      <Link
                        to={to}
                        params={{ eventId: event.id }}
                      >
                        {action}
                      </Link>
                    </Button>
                  ) : null}
                </div>
                {isDone ? <Badge variant="success">{t("overview.setup.done")}</Badge> : null}
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
