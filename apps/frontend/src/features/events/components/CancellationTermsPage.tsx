import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/lib/notify"

import {
  CANCELLATION_TERMS_MAX_LENGTH,
  eventKeys,
  eventQueryOptions,
  setCancellationTerms,
  type OrganizerEvent,
} from "@/features/events/api/events"

/**
 * Cancellation terms of an event (US-47): free text the organizer writes, then a preview of
 * what applicants read, with a way back to editing.
 */
// Figma (Design system): #47 / Storno podmínky / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36401
// Figma (Design system): #47 / Storno podmínky / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36549
// Figma (Design system): #47 / Náhled storno podmínek / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36625
// Figma (Design system): #47 / Náhled storno podmínek / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36764
export function CancellationTermsPage({ eventId }: { eventId: string }) {
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
    <CancellationTerms
      key={event.id}
      event={event}
    />
  )
}

function CancellationTerms({ event }: { event: OrganizerEvent }) {
  const [isEditing, setIsEditing] = useState(event.cancellationTerms === null)
  return isEditing ? (
    <CancellationTermsForm
      event={event}
      onSaved={() => setIsEditing(false)}
    />
  ) : (
    <CancellationTermsPreview
      text={event.cancellationTerms ?? ""}
      onEdit={() => setIsEditing(true)}
    />
  )
}

function CancellationTermsForm({ event, onSaved }: { event: OrganizerEvent; onSaved: () => void }) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [text, setText] = useState(event.cancellationTerms ?? "")
  const [hasAttempted, setHasAttempted] = useState(false)
  const isInvalid = hasAttempted && text.trim() === ""
  const mutation = useMutation({
    mutationFn: () => setCancellationTerms(event.id, text.trim()),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      ])
      notify.success(t("cancellationTerms.saved"))
      onSaved()
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setHasAttempted(true)
    if (text.trim() === "") return
    mutation.mutate()
  }

  return (
    <form
      noValidate
      className="flex max-w-196 flex-col gap-6"
      onSubmit={submit}
    >
      <SectionHeader
        title={t("cancellationTerms.title")}
        description={t("cancellationTerms.subtitle", { name: event.name })}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="cancellation-terms">{t("cancellationTerms.label")}</Label>
        <Textarea
          id="cancellation-terms"
          rows={4}
          maxLength={CANCELLATION_TERMS_MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={isInvalid || undefined}
          aria-describedby={isInvalid ? "cancellation-terms-error" : undefined}
        />
        {isInvalid ? (
          <p
            id="cancellation-terms-error"
            className="text-sm text-destructive"
          >
            {t("cancellationTerms.required")}
          </p>
        ) : null}
      </div>
      <Alert className="bg-accent">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>{t("cancellationTerms.alertTitle")}</AlertTitle>
        <AlertDescription>{t("cancellationTerms.alertDescription")}</AlertDescription>
      </Alert>
      {mutation.isError ? (
        <ErrorState
          title={t("cancellationTerms.saveFailed")}
          error={mutation.error}
        />
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
        {t("cancellationTerms.save")}
      </Button>
    </form>
  )
}

function CancellationTermsPreview({ text, onEdit }: { text: string; onEdit: () => void }) {
  const { t } = useTranslation("events")
  const paragraphs = text.split("\n").filter((line) => line.trim() !== "")

  return (
    <div className="flex max-w-196 flex-col gap-6">
      <SectionHeader title={t("cancellationTerms.previewTitle")} />
      <Card className="gap-4 p-4">
        <h3 className="text-2xl font-bold tracking-tight">{t("cancellationTerms.label")}</h3>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </Card>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={onEdit}
      >
        {t("cancellationTerms.edit")}
      </Button>
    </div>
  )
}
