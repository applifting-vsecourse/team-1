import { useId, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Info, Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { SettingsCard } from "@/components/molecules/SettingsCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

import {
  evaluationModeSchema,
  eventKeys,
  eventQueryOptions,
  setEvaluationMode,
  type EvaluationMode,
} from "@/features/events/api/events"
import { CancellationStartForm } from "@/features/events/components/CancellationStartForm"
import { DeleteEventSection } from "@/features/events/components/DeleteEventSection"
import { PublicPageForm } from "@/features/events/components/PublicPageForm"

const MODES = ["AUTOMATIC", "MANUAL"] as const

/**
 * Settings of an event under the event header (US-101): the evaluation mode,
 * editable until the first application arrives and shown locked with the reason afterwards,
 * and the public page content (US-122).
 */
// Figma v2: US-101 evaluation settings before opening, desktop and mobile · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15741-4669 (mobile 15741-4746)
// Locked mode · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15741-4923 (mobile 15741-5004)
export function EventSettings({ eventId }: { eventId: string }) {
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

  return (
    <div className="mx-auto flex w-full max-w-196 flex-col gap-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />
      {event.evaluationModeLocked ? (
        <LockedMode mode={event.evaluationMode} />
      ) : (
        <ChooseMode
          eventId={eventId}
          saved={event.evaluationMode}
        />
      )}
      <CancellationStartForm
        key={event.id}
        event={event}
      />
      <PublicPageForm event={event} />
      <DeleteEventSection event={event} />
    </div>
  )
}

function LockedChoices({ selected }: { selected: EvaluationMode }) {
  const { t } = useTranslation("events")
  const groupId = useId()
  return (
    <RadioGroup
      disabled
      value={selected}
      aria-label={t("evaluationMode.legend")}
      className="grid gap-4"
    >
      {MODES.map((mode) => {
        const id = `${groupId}-${mode}`
        const name = t(mode === "AUTOMATIC" ? "evaluationMode.automatic" : "evaluationMode.manual")
        return (
          <Label
            key={mode}
            htmlFor={id}
            className={cn(
              "flex-col items-start gap-1 rounded-lg border px-4 py-3",
              selected === mode && "bg-accent",
            )}
          >
            <span className="flex items-center gap-3 py-2">
              <RadioGroupItem
                value={mode}
                id={id}
                aria-labelledby={id + "-label"}
                aria-describedby={id + "-hint"}
              />
              <span id={id + "-label"}>{name}</span>
            </span>
            <span
              id={id + "-hint"}
              className="text-sm font-normal text-muted-foreground"
            >
              {t(
                mode === "AUTOMATIC" ? "evaluationMode.automaticHint" : "evaluationMode.manualHint",
              )}
            </span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}

function LockedMode({ mode }: { mode: EvaluationMode }) {
  const { t } = useTranslation("events")
  return (
    <SettingsCard title={t("evaluationMode.title")}>
      <LockedChoices selected={mode} />
      <Alert
        role="note"
        className="bg-secondary"
      >
        <TriangleAlert aria-hidden />
        <AlertTitle>{t("evaluationMode.lockNotice")}</AlertTitle>
        <AlertDescription>{t("evaluationMode.lockedReason")}</AlertDescription>
      </Alert>
    </SettingsCard>
  )
}

function ChooseMode({ eventId, saved }: { eventId: string; saved: EvaluationMode }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<EvaluationMode>(saved)
  const mutation = useMutation({
    mutationFn: () => setEvaluationMode(eventId, mode),
    onSuccess: async (updated) => {
      setMode(updated.evaluationMode)
      notify.success(t("evaluationMode.saved"))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      ])
    },
  })

  return (
    <SettingsCard title={t("evaluationMode.title")}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <RadioGroup
          aria-label={t("evaluationMode.legend")}
          value={mode}
          onValueChange={(value) => setMode(evaluationModeSchema.parse(value))}
          disabled={mutation.isPending}
          className="grid gap-4"
        >
          {MODES.map((value) => {
            const name = t(`evaluationMode.${value === "AUTOMATIC" ? "automatic" : "manual"}`)
            return (
              <div
                key={value}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3",
                  value === mode && "bg-accent",
                )}
              >
                <RadioGroupItem
                  id={`evaluation-mode-${value}`}
                  value={value}
                />
                <Label htmlFor={`evaluation-mode-${value}`}>{name}</Label>
                {/* A popover, not a tooltip: it opens on tap and on Enter / Space too. */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("evaluationMode.infoLabel", { mode: name })}
                    >
                      <Info />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="text-sm">
                    {t(`evaluationMode.${value === "AUTOMATIC" ? "automaticInfo" : "manualInfo"}`)}
                  </PopoverContent>
                </Popover>
              </div>
            )
          })}
        </RadioGroup>
        <p className="text-sm text-muted-foreground">{t("evaluationMode.afterOpenLocked")}</p>
        {mutation.isError ? (
          <ErrorState
            title={t("evaluationMode.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="submit"
            size="lg"
            className="sm:flex-1"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t("evaluationMode.save")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="sm:flex-1"
            disabled={mutation.isPending}
            onClick={() => {
              setMode(saved)
              mutation.reset()
            }}
          >
            {t("evaluationMode.discard")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}
