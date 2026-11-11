import { useState, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DateField } from "@/components/molecules/DateField"
import { ErrorState } from "@/components/molecules/ErrorState"
import { SettingsCard } from "@/components/molecules/SettingsCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/date"
import { isIsoDate, todayIsoInAppZone } from "@/lib/date-input"

import { eventKeys, setCancellationStart, type OrganizerEvent } from "@/features/events/api/events"

// Figma: US-113 / Nastavení akce · Storno · Bez data / Nastavit datum / Datum uložené
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15903-7883
export function CancellationStartForm({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [isEnabled, setIsEnabled] = useState(event.cancellationStartsOn !== null)
  const [date, setDate] = useState(event.cancellationStartsOn ?? "")
  const [hasAttempted, setHasAttempted] = useState(false)
  const [savedDate, setSavedDate] = useState<string | undefined>(
    event.cancellationStartsOn ?? undefined,
  )
  // A new or changed date may not be in the past; the unchanged (even lapsed) date stays valid.
  const isDateInPast =
    isIsoDate(date) && date !== event.cancellationStartsOn && date < todayIsoInAppZone()
  const isDateInvalid = hasAttempted && isEnabled && (!isIsoDate(date) || isDateInPast)
  const mutation = useMutation({
    mutationFn: () => setCancellationStart(event.id, isEnabled ? date : null),
    onSuccess: async (saved) => {
      setHasAttempted(false)
      setSavedDate(saved.cancellationStartsOn ?? undefined)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      ])
    },
  })

  const reset = () => {
    setIsEnabled(event.cancellationStartsOn !== null)
    setDate(event.cancellationStartsOn ?? "")
    setHasAttempted(false)
    setSavedDate(event.cancellationStartsOn ?? undefined)
    mutation.reset()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setHasAttempted(true)
    if (isEnabled && (!isIsoDate(date) || isDateInPast)) return
    mutation.mutate()
  }

  return (
    <SettingsCard title={t("cancellationStart.title")}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={submit}
      >
        <div className="flex min-h-10 items-center gap-3">
          <Checkbox
            id="cancellation-start-enabled"
            checked={isEnabled}
            onCheckedChange={(checked) => {
              setIsEnabled(checked === true)
              setHasAttempted(false)
              setSavedDate(undefined)
              mutation.reset()
            }}
          />
          <Label
            htmlFor="cancellation-start-enabled"
            className="text-base leading-6 font-normal"
          >
            {t("cancellationStart.enable")}
          </Label>
        </div>
        {isEnabled ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancellation-start-date">{t("cancellationStart.dateLabel")}</Label>
            <DateField
              id="cancellation-start-date"
              value={date}
              min={todayIsoInAppZone()}
              onChange={(value) => {
                setDate(value)
                setSavedDate(undefined)
                mutation.reset()
              }}
              aria-invalid={isDateInvalid || undefined}
              aria-describedby={isDateInvalid ? "cancellation-start-error" : undefined}
            />
            {isDateInvalid ? (
              <p
                id="cancellation-start-error"
                className="text-sm text-destructive"
              >
                {t(isDateInPast ? "cancellationStart.dateInPast" : "cancellationStart.invalidDate")}
              </p>
            ) : null}
          </div>
        ) : null}
        <p>{t(isEnabled ? "cancellationStart.afterDate" : "cancellationStart.noDate")}</p>
        {savedDate ? (
          <Alert className="bg-accent">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{t("cancellationStart.savedTitle")}</AlertTitle>
            <AlertDescription>
              {t("cancellationStart.savedDate", { date: formatDate(savedDate) })}
            </AlertDescription>
          </Alert>
        ) : null}
        {mutation.isError ? (
          <ErrorState
            title={t("cancellationStart.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        {savedDate === undefined ? (
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              type="submit"
              size="lg"
              className="sm:flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
              {t("cancellationStart.save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="sm:flex-1"
              onClick={reset}
            >
              {t("cancellationStart.cancel")}
            </Button>
          </div>
        ) : null}
      </form>
    </SettingsCard>
  )
}
