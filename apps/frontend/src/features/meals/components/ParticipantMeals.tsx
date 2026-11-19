import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CheckboxRow } from "@/components/molecules/CheckboxRow"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { notify } from "@/lib/notify"

import { ownMealsQueryOptions, saveOwnMeals, type OwnMeals } from "@/features/meals/api/meals"

/** Same limit as the API (`ALLERGIES_MAX_LENGTH`). */
const ALLERGIES_MAX_LENGTH = 1000
/** Same limit as the API (`SPECIAL_REQUEST_MAX_LENGTH`). */
const SPECIAL_REQUEST_MAX_LENGTH = 1000

/** The meal restrictions of the participant of one application: ticked options and allergies. */
// Figma (Design system): #64 / Stravování · Adam Dvořák / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-11810 (360 px: node-id=19795-11931)
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
  const [optionIds, setOptionIds] = useState(new Set(meals.selectedOptionIds))
  const [allergies, setAllergies] = useState(meals.allergies ?? "")
  const [specialRequest, setSpecialRequest] = useState(meals.specialRequest ?? "")
  const [hasNone, setHasNone] = useState(meals.noRestrictions)

  const mutation = useMutation({
    // An option the organizer removed meanwhile is no longer offered, so it is not sent either.
    mutationFn: () =>
      saveOwnMeals(
        applicationId,
        hasNone
          ? { optionIds: [], allergies: "", specialRequest: "", noRestrictions: true }
          : {
              optionIds: meals.options.map((option) => option.id).filter((id) => optionIds.has(id)),
              allergies,
              specialRequest,
              noRestrictions: false,
            },
      ),
    onSuccess: async (saved) => {
      client.setQueryData(ownMealsQueryOptions(applicationId).queryKey, saved)
      // The overview of the application shows the meals step as done (US-149).
      void client.invalidateQueries({ queryKey: ["participant", "applications", applicationId] })
      void client.invalidateQueries({ queryKey: ["organizer", "events"] })
      notify.success(t("own.saved"))
      await navigate({ to: ROUTES.participant.application, params: { applicationId } })
    },
  })

  const toggle = (id: string, isChecked: boolean) =>
    setOptionIds((current) => {
      const next = new Set(current)
      if (isChecked) next.add(id)
      else next.delete(id)
      return next
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
        <h2 className="text-lg font-semibold">{t("own.restrictions")}</h2>
        {/* US-150: confirms the step without any restriction; not drawn in Figma. */}
        <CheckboxRow
          id="meal-none"
          label={t("own.noRestrictions")}
          checked={hasNone}
          onCheckedChange={(isChecked) => setHasNone(isChecked === true)}
        />
        {meals.options.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{t("own.multiple")}</p>
            {meals.options.map((option) => (
              <CheckboxRow
                key={option.id}
                id={`meal-${option.id}`}
                label={option.name}
                checked={optionIds.has(option.id)}
                disabled={hasNone}
                onCheckedChange={(isChecked) => toggle(option.id, isChecked === true)}
              />
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="meal-allergies">{t("own.allergiesLabel")}</Label>
          <Textarea
            id="meal-allergies"
            className="min-h-32"
            maxLength={ALLERGIES_MAX_LENGTH}
            disabled={hasNone}
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
          />
        </div>
        {/* PM-requested addition (US-64), not drawn in Figma. */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="meal-special-request">{t("own.specialRequestLabel")}</Label>
          <Textarea
            id="meal-special-request"
            className="min-h-32"
            maxLength={SPECIAL_REQUEST_MAX_LENGTH}
            disabled={hasNone}
            value={specialRequest}
            onChange={(event) => setSpecialRequest(event.target.value)}
          />
        </div>
        <p className="text-sm text-muted-foreground">{t("own.optional")}</p>
        {mutation.error ? (
          <Alert variant="destructive">
            <AlertDescription>{mutation.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto sm:self-start"
          disabled={mutation.isPending}
        >
          {t("own.save")}
        </Button>
      </Card>
    </form>
  )
}
