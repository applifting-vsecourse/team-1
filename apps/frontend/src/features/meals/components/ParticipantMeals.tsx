import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { ownMealsQueryOptions, saveOwnMeals, type OwnMeals } from "@/features/meals/api/meals"

/** Same limit as the API (`ALLERGIES_MAX_LENGTH`). */
const ALLERGIES_MAX_LENGTH = 1000

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
  const [optionIds, setOptionIds] = useState(new Set(meals.selectedOptionIds))
  const [allergies, setAllergies] = useState(meals.allergies ?? "")

  const mutation = useMutation({
    // An option the organizer removed meanwhile is no longer offered, so it is not sent either.
    mutationFn: () =>
      saveOwnMeals(applicationId, {
        optionIds: meals.options.map((option) => option.id).filter((id) => optionIds.has(id)),
        allergies,
      }),
    onSuccess: (saved) => {
      client.setQueryData(ownMealsQueryOptions(applicationId).queryKey, saved)
      void client.invalidateQueries({ queryKey: ["organizer", "events"] })
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
        title={t("own.title", { name: `${meals.firstName} ${meals.lastName}` })}
        description={meals.eventName}
      />
      {meals.options.length > 0 ? (
        <div className="flex flex-col gap-6">
          {meals.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-3 py-2"
            >
              <Checkbox
                id={`meal-${option.id}`}
                className="size-6"
                checked={optionIds.has(option.id)}
                onCheckedChange={(isChecked) => toggle(option.id, isChecked === true)}
              />
              <Label
                htmlFor={`meal-${option.id}`}
                className="flex-1 cursor-pointer leading-5 font-normal"
              >
                {option.name}
              </Label>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="meal-allergies">{t("own.allergiesLabel")}</Label>
        <Textarea
          id="meal-allergies"
          className="min-h-32"
          maxLength={ALLERGIES_MAX_LENGTH}
          value={allergies}
          onChange={(event) => setAllergies(event.target.value)}
        />
      </div>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
      >
        {t("own.save")}
      </Button>
    </form>
  )
}
