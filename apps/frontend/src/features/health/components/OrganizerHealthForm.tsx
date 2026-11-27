import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { CheckboxRow } from "@/components/molecules/CheckboxRow"
import { ErrorState } from "@/components/molecules/ErrorState"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/lib/notify"

import { organizerHealthQueryOptions, saveOrganizerHealth } from "@/features/health/api/health"

/** Same limit as the API (`HEALTH_NOTE_MAX_LENGTH`). */
const NOTE_MAX_LENGTH = 2000

/**
 * The organizer writes the first health restriction (or "no restriction") for a participant who
 * does not use the application (D-191). Nothing is saved until the organizer confirms having the
 * applicant's explicit consent; a stored note changes only through a request (D-122).
 * The fields are those of the participant's form.
 */
// Figma (Design system v2): #789 / Organizátor · Zdravotní omezení · zápis se souhlasem · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27488-124172 (360 px: node-id=27488-124304)
export function OrganizerHealthForm({
  eventId,
  applicationId,
  hasConfirmedNone,
  isClosed = false,
}: {
  eventId: string
  applicationId: string
  /** „No restriction“ is already stored: only a note changes anything. */
  hasConfirmedNone: boolean
  /** Every term is over or cancelled: nothing can be entered any more. */
  isClosed?: boolean
}) {
  const { t } = useTranslation("health")
  const client = useQueryClient()
  const navigate = useNavigate()
  const [note, setNote] = useState("")
  const [hasNone, setHasNone] = useState(hasConfirmedNone)
  const [hasConsent, setHasConsent] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      saveOrganizerHealth(applicationId, {
        note: hasNone ? "" : note,
        noRestriction: hasNone,
        consentConfirmed: hasConsent,
      }),
    onSuccess: async (saved) => {
      client.setQueryData(organizerHealthQueryOptions(applicationId).queryKey, saved)
      void client.invalidateQueries({ queryKey: ["participant", "applications"] })
      void client.invalidateQueries({ queryKey: ["organizer", "applications", applicationId] })
      void client.invalidateQueries({ queryKey: ["eventOverview"] })
      notify.success(t("organizerSaved"))
      await navigate({ to: ROUTES.organizer.application, params: { eventId, applicationId } })
    },
  })

  const hasContent = hasNone ? !hasConfirmedNone : note.trim() !== ""
  const noteId = "organizer-health-note"

  return (
    <Card className="gap-4 p-4 md:p-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate()
        }}
      >
        <h3 className="text-xl font-bold tracking-tight md:text-2xl">{t("organizerWriteTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("organizerWriteHint")}</p>
        {isClosed ? <p className="text-sm text-muted-foreground">{t("closed")}</p> : null}
        <CheckboxRow
          id="organizer-health-none"
          label={t("noRestriction")}
          checked={hasNone}
          disabled={isClosed}
          onCheckedChange={(isChecked) => setHasNone(isChecked === true)}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor={noteId}>{t("noteLabel")}</Label>
          <Textarea
            id={noteId}
            className="min-h-32"
            maxLength={NOTE_MAX_LENGTH}
            disabled={hasNone || isClosed}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <CheckboxRow
          id="organizer-health-consent"
          label={t("organizerConsent")}
          checked={hasConsent}
          // The stored „no restriction“ leaves nothing to consent to.
          disabled={isClosed || (hasConfirmedNone && hasNone)}
          onCheckedChange={(isChecked) => setHasConsent(isChecked === true)}
        />
        {mutation.error ? (
          <ErrorState
            title={t("organizerSaveFailed")}
            error={mutation.error}
          />
        ) : null}
        <PendingButton
          type="submit"
          size="lg"
          className="self-start"
          isPending={mutation.isPending}
          disabled={isClosed || !hasContent || !hasConsent}
        >
          {t("organizerSave")}
        </PendingButton>
      </form>
    </Card>
  )
}
