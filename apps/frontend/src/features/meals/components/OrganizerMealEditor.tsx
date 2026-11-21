import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { notify } from "@/lib/notify"

import {
  organizerMealsQueryOptions,
  saveOrganizerMeals,
  type OrganizerMeals,
} from "@/features/meals/api/meals"

import { MealSelectionFields, useMealDraft } from "./MealSelectionFields"

// Figma: Úprava stravování · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27267-3504 (mobile 27267-3543).
export function OrganizerMealEditor({
  eventId,
  meals,
}: {
  eventId: string
  meals: OrganizerMeals
}) {
  const { t } = useTranslation("meals")
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const label = t("edit.forPerson", { name: `${meals.firstName} ${meals.lastName}` })
  if (!meals.editable) return null
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isNextOpen) => {
        if (!isSaving) setIsOpen(isNextOpen)
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          title={label}
          aria-label={label}
        >
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>
      {isOpen && (
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-[520px]"
          showCloseButton={!isSaving}
        >
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>
              {meals.firstName} {meals.lastName}
            </DialogDescription>
          </DialogHeader>
          <EditorForm
            eventId={eventId}
            meals={meals}
            onClose={() => setIsOpen(false)}
            onSaving={setIsSaving}
          />
        </DialogContent>
      )}
    </Dialog>
  )
}

function EditorForm({
  eventId,
  meals,
  onClose,
  onSaving,
}: {
  eventId: string
  meals: OrganizerMeals
  onClose: () => void
  onSaving: (isSaving: boolean) => void
}) {
  const { t } = useTranslation("meals")
  const client = useQueryClient()
  const draft = useMealDraft(meals)
  const mutation = useMutation({
    mutationFn: () => saveOrganizerMeals(eventId, meals.applicationId, draft.values),
    onMutate: () => onSaving(true),
    onSuccess: (saved) => {
      client.setQueryData(organizerMealsQueryOptions(eventId, meals.applicationId).queryKey, saved)
      void client.invalidateQueries({ queryKey: ["organizer", "events", eventId, "meals"] })
      void client.invalidateQueries({
        queryKey: ["participant", "applications", meals.applicationId],
      })
      notify.success(t("own.saved"))
      onClose()
    },
    onSettled: () => onSaving(false),
  })
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!mutation.isPending) mutation.mutate()
      }}
    >
      <fieldset
        className="grid min-w-0 gap-3"
        disabled={mutation.isPending}
      >
        <MealSelectionFields
          draft={draft}
          noneLabel={t("edit.none")}
        />
      </fieldset>
      {mutation.error && (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}
      <DialogFooter className="flex-col sm:flex-row">
        <PendingButton
          isPending={mutation.isPending}
          type="submit"
        >
          {t("own.save")}
        </PendingButton>
        <Button
          type="button"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          {t("edit.cancel")}
        </Button>
      </DialogFooter>
    </form>
  )
}
