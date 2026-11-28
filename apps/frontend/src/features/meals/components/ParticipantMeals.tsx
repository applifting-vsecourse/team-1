import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { notify } from "@/lib/notify"

import { ownMealsQueryOptions, saveOwnMeals, type OwnMeals } from "@/features/meals/api/meals"

import { MealSelectionFields, useMealDraft } from "./MealSelectionFields"

/** The meal restrictions of the participant of one application: ticked options and allergies. */
// Figma (Design system v2): US-64 / Upravit stravování / Desktop · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20697-16009 (360 px: node-id=20697-16148)
export function ParticipantMeals({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("meals")
  const { data, isPending, error, refetch } = useQuery(ownMealsQueryOptions(applicationId))

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("own.pageTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  return (
    <MealsForm
      applicationId={applicationId}
      meals={data}
    />
  )
}

function MealsForm({ applicationId, meals }: { applicationId: string; meals: OwnMeals }) {
  const { t } = useTranslation("meals")
  const client = useQueryClient()
  const navigate = useNavigate()
  const draft = useMealDraft(meals)
  const mutation = useMutation({
    mutationFn: () => saveOwnMeals(applicationId, draft.values),
    onSuccess: async (saved) => {
      client.setQueryData(ownMealsQueryOptions(applicationId).queryKey, saved)
      // The overview of the application shows the meals step as done (US-149).
      void client.invalidateQueries({ queryKey: ["participant", "applications", applicationId] })
      void client.invalidateQueries({ queryKey: ["organizer", "events"] })
      notify.success(t("own.saved"))
      await navigate({ to: ROUTES.participant.application, params: { applicationId } })
    },
  })

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <PageHeader
        hasBand
        motif="planning"
        title={t("own.title", { name: `${meals.firstName} ${meals.lastName}` })}
        description={meals.eventName}
      />
      <Card className="mx-auto w-full max-w-[720px] gap-4 p-4">
        <h2 className="text-2xl font-bold tracking-tight">{t("own.restrictions")}</h2>
        {/* After the last term that is not cancelled the meals cannot be changed (D-192). */}
        <fieldset
          disabled={!meals.editable}
          className="flex min-w-0 flex-col gap-4"
        >
          <MealSelectionFields
            draft={draft}
            noneLabel={t("own.noRestrictions")}
          />
        </fieldset>
        {mutation.error ? (
          <Alert variant="destructive">
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
        {meals.editable ? (
          <PendingButton
            isPending={mutation.isPending}
            type="submit"
            size="lg"
            className="w-full sm:w-auto sm:self-start"
          >
            {t("own.save")}
          </PendingButton>
        ) : (
          <p className="text-sm text-muted-foreground">{t("own.closed")}</p>
        )}
      </Card>
    </form>
  )
}
