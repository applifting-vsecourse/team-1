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
// Figma (Design system): A1 Přehled akce · Volba režimu v kroku · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26157-1995
// Figma (Design system): A3 Přehled akce · Volba režimu v kroku · Mobil 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26157-2050
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
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (mode) mutation.mutate(mode)
      }}
    >
      <RadioGroup
        aria-label={t("evaluationMode.legend")}
        value={mode ?? ""}
        onValueChange={(value) => setMode(evaluationModeSchema.parse(value))}
        className="grid gap-4 sm:grid-cols-2"
      >
        {MODES.map(({ value, key }) => (
          // A hairline row, not a card in a card; the label stretches over it so the whole row picks.
          <div
            key={value}
            className="relative flex flex-col gap-2 rounded-lg border border-input p-4"
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
              className="pl-9 text-sm text-muted-foreground"
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
