import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import {
  evaluationModeSchema,
  eventKeys,
  eventQueryOptions,
  setEvaluationMode,
  type EvaluationMode,
} from "@/features/events/api/events"

const MODES = ["AUTOMATIC", "MANUAL"] as const

/**
 * Settings of an event under the event header (US-101): the evaluation mode,
 * chosen before applications open and shown locked with the reason afterwards.
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

  return event.evaluationModeLocked ? (
    <LockedMode mode={event.evaluationMode} />
  ) : (
    <ChooseMode
      eventId={eventId}
      saved={event.evaluationMode}
    />
  )
}

function LockedMode({ mode }: { mode: EvaluationMode }) {
  const { t } = useTranslation("events")
  return (
    <Card className="gap-3 p-6">
      <h2 className="text-lg font-semibold tracking-tight">{t("evaluationMode.lockedTitle")}</h2>
      <p>
        {t("evaluationMode.lockedValue", {
          mode: t(`evaluationMode.${mode === "AUTOMATIC" ? "automatic" : "manual"}`),
        })}
      </p>
      <p className="text-sm text-muted-foreground">{t("evaluationMode.lockedReason")}</p>
    </Card>
  )
}

function ChooseMode({ eventId, saved }: { eventId: string; saved: EvaluationMode }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<EvaluationMode>(saved)
  const mutation = useMutation({
    mutationFn: () => setEvaluationMode(eventId, mode),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      ]),
  })

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <SectionHeader
        title={t("evaluationMode.title")}
        description={t("evaluationMode.subtitle")}
      />
      <Card className="gap-4 p-6">
        <h3 className="text-lg font-semibold tracking-tight">{t("evaluationMode.chooseTitle")}</h3>
        <RadioGroup
          aria-label={t("evaluationMode.legend")}
          value={mode}
          onValueChange={(value) => setMode(evaluationModeSchema.parse(value))}
          className="flex flex-col gap-3 sm:flex-row sm:gap-6"
        >
          {MODES.map((value) => (
            <div
              key={value}
              className="flex items-center gap-2"
            >
              <RadioGroupItem
                id={`evaluation-mode-${value}`}
                value={value}
              />
              <Label htmlFor={`evaluation-mode-${value}`}>
                {t(`evaluationMode.${value === "AUTOMATIC" ? "automatic" : "manual"}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-sm text-muted-foreground">{t("evaluationMode.manualHint")}</p>
      </Card>
      <Card className="gap-2 p-6">
        <h3 className="text-lg font-semibold tracking-tight">
          {t("evaluationMode.afterOpenTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("evaluationMode.afterOpenVisible")}</p>
        <p className="text-sm text-muted-foreground">{t("evaluationMode.afterOpenLocked")}</p>
      </Card>
      {mutation.isError ? (
        <ErrorState
          title={t("evaluationMode.saveFailed")}
          error={mutation.error}
        />
      ) : null}
      <div className="flex md:justify-end">
        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
          {t("evaluationMode.save")}
        </Button>
      </div>
    </form>
  )
}
