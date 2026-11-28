import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, CircleCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CopyButton } from "@/components/atoms/CopyButton"
import { CARD_GRID_WIDE, CardGrid } from "@/components/molecules/CardGrid"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { TaskCard } from "@/components/molecules/TaskCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { eventQueryOptions, type OrganizerEvent } from "@/features/events/api/events"
import { EvaluationModeStep } from "@/features/events/components/EvaluationModeStep"
import { applicationLink } from "@/features/events/lib/application-link"

/**
 * The event overview under the event header: either the steps still missing before the application
 * link works (the „Příprava přihlášky“ card) or the evaluation mode and the link itself with its
 * copy button; a toast confirms the copy.
 */
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
      {event.applicationsOpen ? (
        <>
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
          <ShareLink
            key={link}
            link={link}
          />
        </>
      ) : (
        <MissingSteps event={event} />
      )}
    </CardGrid>
  )
}

function ShareLink({ link }: { link: string }) {
  const { t } = useTranslation("events")
  const headingId = useId()
  const [isCopied, setIsCopied] = useState(false)

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
          onCopyResult={setIsCopied}
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
      {isCopied && <p className="text-sm text-primary">{t("overview.copiedHint")}</p>}
    </Card>
  )
}

const STEPS = ["TERM", "ROOM", "EVALUATION_MODE"] as const
type Step = (typeof STEPS)[number]

/**
 * What is left before the link works (US-12), as one white to-do card with the orange strip: the
 * title and „N/3 hotovo“, then the three steps. The current one (the first still missing) is the
 * nav A surface with the 4 × 24 bar, one sentence and its one primary action; done steps show a
 * check and „Hotovo“; the rest only their title. The event's own steps are a term with a price and
 * the rooms; the bank account the frame adds as a third step is already required when the
 * organization is set up (D-126), so it is not a step here.
 */
// Figma (Design system v2): F5 / Přehled akce · 0/3 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15398-536 (mobile 15398-598)
// Figma (Design system v2): F5 / Přehled akce · 1/3 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18658-20426 (mobile 18658-20548)
// Figma (Design system v2): F5 / Přehled akce · 2/3 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18658-20604 (mobile 18658-20726)
function MissingSteps({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  // `missing` names ROOM only for a term without a room, so without a term the rooms are not done yet.
  const isStepDone = (step: Step) =>
    !event.missing.includes(step) && (step !== "ROOM" || event.termCount > 0)
  const current = STEPS.find((step) => !isStepDone(step)) ?? "EVALUATION_MODE"
  const done = STEPS.filter(isStepDone).length
  const steps = {
    TERM: {
      title: t("overview.setup.termStep"),
      hint: t("overview.setup.termNow"),
      action: t("overview.setup.addTerm"),
      to: ROUTES.organizer.eventTerms,
    },
    ROOM: {
      title: t("overview.setup.roomStep"),
      hint: t("overview.setup.roomNow"),
      action: t("overview.setup.setCapacity"),
      to: ROUTES.organizer.eventRooms,
    },
    EVALUATION_MODE: {
      title: t("overview.setup.modeStep"),
      hint: t("overview.setup.modeNow"),
      action: null,
      to: ROUTES.organizer.eventSettings,
    },
  } as const satisfies Record<Step, unknown>

  return (
    <TaskCard className={`${CARD_GRID_WIDE} gap-4 p-4 pt-5 md:p-6 md:pt-7`}>
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-xl font-bold tracking-tight">{t("overview.setup.title")}</h2>
        <span className="text-sm font-medium text-muted-foreground">
          {t("overview.setup.progress", { done, total: STEPS.length })}
        </span>
      </div>
      <ol
        aria-label={t("overview.setup.steps")}
        className="flex flex-col gap-1"
      >
        {STEPS.map((step, index) => {
          const isDone = isStepDone(step)
          const isCurrent = step === current
          const { title, hint, action, to } = steps[step]
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "relative flex gap-3 rounded-control px-4 py-3",
                isCurrent ? "items-start bg-nav-active" : "items-center",
                // With its button at the right (desktop) the current step centres like the others.
                isCurrent && action && "md:items-center",
              )}
            >
              {isCurrent ? (
                <span
                  aria-hidden="true"
                  data-slot="step-indicator"
                  className="absolute top-3 left-0 h-6 w-1 rounded-r-xs bg-nav-indicator"
                />
              ) : null}
              {isDone ? (
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <CircleCheck
                    aria-hidden
                    className="size-5 text-muted-foreground"
                  />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-medium",
                    isCurrent ? "border-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h3
                    className={cn(
                      isCurrent ? "font-semibold" : "font-normal",
                      !isCurrent && !isDone && "text-muted-foreground",
                    )}
                  >
                    {title}
                  </h3>
                  {isCurrent ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
                  {isDone && step === "EVALUATION_MODE" ? (
                    // The chosen mode stays visible and changeable until it locks (US-560).
                    <p className="text-sm text-muted-foreground">
                      {t(
                        `evaluationMode.${event.evaluationMode === "AUTOMATIC" ? "automatic" : "manual"}`,
                      )}
                      {event.evaluationModeLocked ? null : (
                        <>
                          {" · "}
                          <Link
                            to={to}
                            params={{ eventId: event.id }}
                            className="font-medium text-link hover:underline"
                          >
                            {t("evaluationMode.change")}
                          </Link>
                        </>
                      )}
                    </p>
                  ) : null}
                  {isCurrent && step === "EVALUATION_MODE" ? (
                    <div className="pt-3">
                      <EvaluationModeStep eventId={event.id} />
                    </div>
                  ) : null}
                </div>
                {isCurrent && action ? (
                  <Button
                    asChild
                    size="lg"
                    className="w-full md:w-auto"
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
              {isDone ? (
                <span className="text-sm text-muted-foreground">{t("overview.setup.done")}</span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </TaskCard>
  )
}
