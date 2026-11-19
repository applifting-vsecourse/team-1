import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Info, ListChecks, Loader2, Lock } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CARD_GRID_WIDE, CardGrid } from "@/components/molecules/CardGrid"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { SettingsCard } from "@/components/molecules/SettingsCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { notify } from "@/lib/notify"

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
 * chosen before applications open and shown locked with the reason afterwards,
 * and the public page content (US-122).
 */
// Figma (Design system): US-101 Volba režimu před otevřením přihlášek · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14825-13299
// Figma (Design system): O24 Nastavení akce · uzamčený režim · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12282-1018
// Figma (Design system): US-101 Režim vyhodnocování · Mobil 360 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14840-3513
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

  // Row-based and equally tall: evaluation | approval, then public details and delete full width.
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />
      <CardGrid className="items-stretch">
        {event.evaluationModeLocked ? (
          <LockedMode mode={event.evaluationMode} />
        ) : (
          <ChooseMode
            eventId={eventId}
            saved={event.evaluationModePending ? null : event.evaluationMode}
          />
        )}
        <CancellationStartForm
          key={event.id}
          event={event}
        />
        <div className={CARD_GRID_WIDE}>
          <PublicPageForm event={event} />
        </div>
        <div className={CARD_GRID_WIDE}>
          <DeleteEventSection event={event} />
        </div>
      </CardGrid>
    </div>
  )
}

function LockedMode({ mode }: { mode: EvaluationMode }) {
  const { t } = useTranslation("events")
  return (
    <SettingsCard
      icon={ListChecks}
      title={t("evaluationMode.title")}
      description={t("evaluationMode.description")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{t(`evaluationMode.${mode === "AUTOMATIC" ? "automatic" : "manual"}`)}</Badge>
        <Badge variant="secondary">
          <Lock aria-hidden="true" />
          {t("evaluationMode.locked")}
        </Badge>
      </div>
      <p className="mt-auto flex items-start gap-2 text-sm text-muted-foreground">
        <Lock
          className="mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        {t("evaluationMode.lockedReason")}
      </p>
    </SettingsCard>
  )
}

// `saved` is null while the organizer has not chosen the mode yet: nothing is preselected (US-560).
function ChooseMode({ eventId, saved }: { eventId: string; saved: EvaluationMode | null }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<EvaluationMode | null>(saved)
  const mutation = useMutation({
    mutationFn: (chosen: EvaluationMode) => setEvaluationMode(eventId, chosen),
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
    <SettingsCard
      icon={ListChecks}
      title={t("evaluationMode.title")}
      description={t("evaluationMode.description")}
    >
      <form
        className="flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (mode) mutation.mutate(mode)
        }}
      >
        <RadioGroup
          aria-label={t("evaluationMode.legend")}
          value={mode ?? ""}
          onValueChange={(value) => setMode(evaluationModeSchema.parse(value))}
          className="flex flex-col gap-3 sm:flex-row sm:gap-6"
        >
          {MODES.map((value) => {
            const name = t(`evaluationMode.${value === "AUTOMATIC" ? "automatic" : "manual"}`)
            return (
              <div
                key={value}
                className="flex items-center gap-2"
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
        <p className="mt-auto text-sm text-muted-foreground">
          {t("evaluationMode.afterOpenLocked")}
        </p>
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
            disabled={mode === null || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t("evaluationMode.save")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}
