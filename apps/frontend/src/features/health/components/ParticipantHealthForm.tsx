import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { CheckboxRow } from "@/components/molecules/CheckboxRow"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
// Figma (Design system v2): US-68 / Před udělením souhlasu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21218-17181 (360 px: node-id=21218-17327)
// Figma (Design system v2): US-68 / Souhlas udělen · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21218-17423 (360 px: node-id=21218-17559)
export function ParticipantHealthForm({
  applicationId,
  onClose,
}: {
  applicationId: string
  onClose: () => Promise<void>
}) {
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
      onClose={onClose}
    />
  )
}

function HealthFields({
  applicationId,
  health,
  onClose,
}: {
  applicationId: string
  health: Health
  onClose: () => Promise<void>
}) {
  const { t } = useTranslation("health")
  const client = useQueryClient()
  // Filled-in data is read-only; changing it goes through a request to the organizer.
  const isStored = health.note !== null
  const [isEditing, setIsEditing] = useState(false)
  const [note, setNote] = useState(health.note ?? "")
  const [hasConsent, setHasConsent] = useState(health.consentAt !== null)
  const [hasNone, setHasNone] = useState(health.noRestriction && !isStored)

  const mutation = useMutation({
    mutationKey: ownHealthQueryOptions(applicationId).queryKey,
    mutationFn: async () => {
      if (isStored) {
        await requestHealthChange(applicationId, { note, consent: hasConsent })
        return null
      }
      return saveHealth(
        applicationId,
        hasNone
          ? { note: "", consent: false, noRestriction: true }
          : { note, consent: hasConsent, noRestriction: false },
      )
    },
    onSuccess: async (saved) => {
      if (saved) client.setQueryData(ownHealthQueryOptions(applicationId).queryKey, saved)
      else {
        await client.invalidateQueries({ queryKey: ownHealthQueryOptions(applicationId).queryKey })
        setIsEditing(false)
      }
      // The overview of the application shows the health step as done (US-149).
      void client.invalidateQueries({ queryKey: ["participant", "applications", applicationId] })
      void client.invalidateQueries({
        queryKey: ["organizer", "applications", applicationId, "health"],
      })
      notify.success(t(isStored ? "requestSent" : "saved"))
      await onClose()
    },
  })

  const hasNote = note.trim() !== ""
  // Filling it in needs the consent; clearing a stored note does not.
  const canSave = isStored
    ? isEditing && note.trim() !== health.note?.trim() && (hasNote ? hasConsent : true)
    : hasNone
      ? !health.noRestriction
      : hasNote
        ? hasConsent
        : health.noRestriction
  const isLocked = isStored && !isEditing
  const pending = health.pendingRequest
  const noteId = "health-note"

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <p className="text-sm text-muted-foreground">
        {health.firstName} {health.lastName} · {health.eventName}
      </p>
      <Alert>
        <AlertTitle>{t("audienceTitle")}</AlertTitle>
        <AlertDescription>{t("audienceText")}</AlertDescription>
      </Alert>
      <Button
        asChild={!mutation.isPending}
        variant="outline"
        size="lg"
        className="w-full sm:w-auto sm:self-start"
        type="button"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          t("goMeals")
        ) : (
          <Link
            to={ROUTES.participant.applicationMeals}
            params={{ applicationId }}
            hash={(hash) => (hash?.startsWith("health-") ? hash.replace(/^health-/, "meals-") : "")}
            replace
          >
            {t("goMeals")}
          </Link>
        )}
      </Button>
      {/* US-150: confirms the step without any restriction; not drawn in Figma. */}
      {isStored ? null : (
        <CheckboxRow
          id="health-none"
          label={t("noRestriction")}
          checked={hasNone}
          onCheckedChange={(isChecked) => setHasNone(isChecked === true)}
        />
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={noteId}>{t("noteLabel")}</Label>
        <Textarea
          id={noteId}
          className="min-h-32"
          maxLength={NOTE_MAX_LENGTH}
          readOnly={isLocked}
          disabled={hasNone}
          value={isLocked ? (health.note ?? "") : note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <CheckboxRow
        id="health-consent"
        label={t("consent")}
        checked={hasConsent}
        disabled={isLocked || hasNone}
        onCheckedChange={(isChecked) => setHasConsent(isChecked === true)}
      />
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
      {!hasConsent && !isLocked && !hasNone && (
        <p className="text-sm text-muted-foreground">{t("consentHint")}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {isLocked ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
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
          <PendingButton
            isPending={mutation.isPending}
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!canSave || mutation.isPending}
          >
            {t(isStored ? "requestSubmit" : "save")}
          </PendingButton>
        )}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={mutation.isPending}
          onClick={() => void onClose()}
        >
          {t("cancelChanges")}
        </Button>
      </div>
    </form>
  )
}
