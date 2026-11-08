import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/lib/notify"

import {
  ownHealthQueryOptions,
  requestHealthChange,
  saveHealth,
  type Health,
} from "@/features/health/api/health"

/** Same limit as the API (`HEALTH_NOTE_MAX_LENGTH`). */
const NOTE_MAX_LENGTH = 2000

/**
 * The participant's health restriction: a note and the explicit consent with its processing.
 * Saving is possible only with the consent (an empty note, which removes the data, needs none).
 */
// Figma (Design system): #68 / Zdravotní omezení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13334 (360 px: node-id=19795-13459)
// Figma (Design system): #68 / Zdravotní omezení · souhlas udělen · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13534 (360 px: node-id=19795-13651)
export function ParticipantHealthForm({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("health")
  const { data, isPending, error, refetch } = useQuery(ownHealthQueryOptions(applicationId))

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  return (
    <HealthFields
      applicationId={applicationId}
      health={data}
    />
  )
}

function HealthFields({ applicationId, health }: { applicationId: string; health: Health }) {
  const { t } = useTranslation("health")
  const client = useQueryClient()
  // Filled-in data is read-only; changing it goes through a request to the organizer.
  const isStored = health.note !== null
  const [isEditing, setIsEditing] = useState(false)
  const [note, setNote] = useState(health.note ?? "")
  const [hasConsent, setHasConsent] = useState(health.consentAt !== null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (isStored) {
        await requestHealthChange(applicationId, { note, consent: hasConsent })
        return null
      }
      return saveHealth(applicationId, { note, consent: hasConsent })
    },
    onSuccess: async (saved) => {
      if (saved) client.setQueryData(ownHealthQueryOptions(applicationId).queryKey, saved)
      else {
        await client.invalidateQueries({ queryKey: ownHealthQueryOptions(applicationId).queryKey })
        setIsEditing(false)
      }
      void client.invalidateQueries({
        queryKey: ["organizer", "applications", applicationId, "health"],
      })
      notify.success(t(isStored ? "requestSent" : "saved"))
    },
  })

  const hasNote = note.trim() !== ""
  // Filling it in needs the consent; clearing a stored note does not.
  const canSave = isStored
    ? isEditing && note.trim() !== health.note?.trim() && (hasNote ? hasConsent : true)
    : hasNote
      ? hasConsent
      : false
  const isLocked = isStored && !isEditing
  const pending = health.pendingRequest
  const noteId = "health-note"

  return (
    <form
      className="flex max-w-196 flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <PageHeader
        title={t("title")}
        description={`${health.firstName} ${health.lastName} · ${health.eventName}`}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={noteId}>{t("noteLabel")}</Label>
        <Textarea
          id={noteId}
          className="min-h-32"
          maxLength={NOTE_MAX_LENGTH}
          readOnly={isLocked}
          value={isLocked ? (health.note ?? "") : note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <Alert>
        <AlertTitle>{t("audienceTitle")}</AlertTitle>
        <AlertDescription>{t("audienceText")}</AlertDescription>
      </Alert>
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox
          id="health-consent"
          className="size-5"
          checked={hasConsent}
          disabled={isLocked}
          onCheckedChange={(isChecked) => setHasConsent(isChecked === true)}
        />
        <Label
          htmlFor="health-consent"
          className="flex-1 cursor-pointer leading-5 font-normal"
        >
          {t("consent")}
        </Label>
      </div>
      {isStored && pending ? (
        <Alert>
          <AlertTitle>{t("pendingTitle")}</AlertTitle>
          <AlertDescription>{t("pendingText")}</AlertDescription>
        </Alert>
      ) : null}
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {isLocked ? (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => {
            setIsEditing(true)
            setNote(health.note ?? "")
            setHasConsent(false)
          }}
        >
          {t("requestChange")}
        </Button>
      ) : (
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSave || mutation.isPending}
        >
          {t(isStored ? "requestSubmit" : "save")}
        </Button>
      )}
    </form>
  )
}
