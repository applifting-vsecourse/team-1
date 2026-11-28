import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { notify } from "@/lib/notify"

import {
  evaluationModeSchema,
  eventKeys,
  setEvaluationMode,
  type EvaluationMode,
} from "@/features/events/api/events"

const MODES = [
  { value: "AUTOMATIC", key: "automatic" },
  { value: "MANUAL", key: "manual" },
] as const

/**
 * The step „Zvolte režim vyhodnocování“ of the checklist: both modes with one sentence each,
 * nothing preselected, the step is done by „Potvrdit režim vyhodnocování“ (US-560). It is shown
 * as the current step of the overview stepper, so its button is the one primary action.
 */
// Figma (Design system v2): F5 / Přehled akce · 2/3 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18658-20604 (mobile 18658-20726)
export function EvaluationModeStep({ eventId }: { eventId: string }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<EvaluationMode | null>(null)
  const mutation = useMutation({
    mutationFn: (chosen: EvaluationMode) => setEvaluationMode(eventId, chosen),
    onSuccess: async () => {
      notify.success(t("evaluationMode.saved"))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      ])
    },
  })

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (mode) mutation.mutate(mode)
      }}
    >
      <RadioGroup
        aria-label={t("evaluationMode.legend")}
        value={mode ?? ""}
        onValueChange={(value) => setMode(evaluationModeSchema.parse(value))}
        className="grid gap-3 sm:grid-cols-2"
      >
        {MODES.map(({ value, key }) => (
          // A hairline row, not a card in a card; the label stretches over it so the whole row picks.
          <div
            key={value}
            className="relative flex flex-col gap-1 rounded-md border border-input bg-card px-4 pt-3 pb-4"
          >
            <div className="flex items-center gap-3 py-2">
              <RadioGroupItem
                id={`step-evaluation-mode-${value}`}
                value={value}
                aria-describedby={`step-evaluation-mode-${value}-info`}
                className="relative z-10"
              />
              <Label
                htmlFor={`step-evaluation-mode-${value}`}
                className="text-base font-normal after:absolute after:inset-0"
              >
                {t(`evaluationMode.${key}`)}
              </Label>
            </div>
            <p
              id={`step-evaluation-mode-${value}-info`}
              className="text-sm text-muted-foreground"
            >
              {t(`evaluationMode.${key}Info`)}
            </p>
          </div>
        ))}
      </RadioGroup>
      <p className="text-sm text-muted-foreground">{t("overview.setup.modeNote")}</p>
      {mutation.isError ? (
        <ErrorState
          title={t("evaluationMode.saveFailed")}
          error={mutation.error}
        />
      ) : null}
      <div className="flex sm:justify-end">
        <PendingButton
          isPending={mutation.isPending}
          type="submit"
          size="lg"
          className="w-full sm:w-auto sm:min-w-55"
          disabled={mode === null}
        >
          {t("evaluationMode.confirm")}
        </PendingButton>
      </div>
    </form>
  )
}
