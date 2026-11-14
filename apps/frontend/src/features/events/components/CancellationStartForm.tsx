import { useState, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DateField } from "@/components/molecules/DateField"
import { ErrorState } from "@/components/molecules/ErrorState"
import { SettingsCard } from "@/components/molecules/SettingsCard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/date"
import { isIsoDate, todayIsoInAppZone } from "@/lib/date-input"
import { notify } from "@/lib/notify"

import { eventKeys, setCancellationStart, type OrganizerEvent } from "@/features/events/api/events"

// Figma: US-113 / Nastavení akce · Schvalování (ve Figmě pod názvem Storno)
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15903-7883
export function CancellationStartForm({ event }: { event: OrganizerEvent }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  // Untouched fields follow server refetches; only user edits have a local draft.
  const [draft, setDraft] = useState<{ isEnabled: boolean; date: string } | null>(null)
  const isEnabled = draft?.isEnabled ?? event.cancellationStartsOn !== null
  const date = draft?.date ?? event.cancellationStartsOn ?? ""
  const updateDraft = (next: { isEnabled: boolean; date: string }) => {
    const isMatchingServer =
      next.isEnabled === (event.cancellationStartsOn !== null) &&
      (!next.isEnabled || next.date === event.cancellationStartsOn)
    setDraft(isMatchingServer ? null : next)
  }
  const [hasAttempted, setHasAttempted] = useState(false)
  // A new or changed date may not be in the past; the unchanged (even lapsed) date stays valid.
  const isDateInPast =
    isIsoDate(date) && date !== event.cancellationStartsOn && date < todayIsoInAppZone()
  const isDateInvalid = hasAttempted && isEnabled && (!isIsoDate(date) || isDateInPast)
  // Save is offered only when the form differs from what is stored.
  const isDirty = (isEnabled ? date : null) !== event.cancellationStartsOn
  const mutation = useMutation({
    mutationFn: (value: string | null) => setCancellationStart(event.id, value),
    onSuccess: async (saved, submitted) => {
      setHasAttempted(false)
      if (saved.cancellationStartsOn) {
        notify.success(
          t("cancellationStart.savedTitle"),
          t("cancellationStart.savedDate", { date: formatDate(saved.cancellationStartsOn) }),
        )
      } else {
        notify.success(
          t("cancellationStart.clearedTitle"),
          t("cancellationStart.clearedDescription"),
        )
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      ])
      setDraft((current) =>
        current && (current.isEnabled ? current.date : null) !== submitted ? current : null,
      )
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setHasAttempted(true)
    if (isEnabled && (!isIsoDate(date) || isDateInPast)) return
    if (!isDirty) return
    mutation.mutate(isEnabled ? date : null)
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
              updateDraft({ isEnabled: checked === true, date })
              setHasAttempted(false)
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
                updateDraft({ isEnabled, date: value })
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
        {mutation.isError ? (
          <ErrorState
            title={t("cancellationStart.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        {isDirty ? (
          <Button
            type="submit"
            size="lg"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t("cancellationStart.save")}
          </Button>
        ) : null}
      </form>
    </SettingsCard>
  )
}
