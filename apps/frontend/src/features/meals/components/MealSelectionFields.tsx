import { useState } from "react"
import { useTranslation } from "react-i18next"

import { CheckboxRow } from "@/components/molecules/CheckboxRow"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { MealSelection, OwnMeals } from "@/features/meals/api/meals"

const ALLERGIES_MAX_LENGTH = 1000
const SPECIAL_REQUEST_MAX_LENGTH = 1000

export function useMealDraft(meals: OwnMeals) {
  const [optionIds, setOptionIds] = useState(new Set(meals.selectedOptionIds))
  const [allergies, setAllergies] = useState(meals.allergies ?? "")
  const [specialRequest, setSpecialRequest] = useState(meals.specialRequest ?? "")
  const [hasNone, setHasNone] = useState(meals.noRestrictions)
  const toggle = (id: string, isChecked: boolean) =>
    setOptionIds((current) => {
      const next = new Set(current)
      if (isChecked) next.add(id)
      else next.delete(id)
      return next
    })

  const values: MealSelection = hasNone
    ? { optionIds: [], allergies: "", specialRequest: "", noRestrictions: true }
    : {
        optionIds: meals.options.filter(({ id }) => optionIds.has(id)).map(({ id }) => id),
        allergies,
        specialRequest,
        noRestrictions: false,
      }
  return {
    values,
    options: meals.options,
    optionIds,
    allergies,
    setAllergies,
    specialRequest,
    setSpecialRequest,
    hasNone,
    setHasNone,
    toggle,
  }
}

export function MealSelectionFields({
  draft,
  noneLabel,
}: {
  draft: ReturnType<typeof useMealDraft>
  noneLabel: string
}) {
  const { t } = useTranslation("meals")
  const {
    options,
    optionIds,
    allergies,
    setAllergies,
    specialRequest,
    setSpecialRequest,
    hasNone,
    setHasNone,
    toggle,
  } = draft
  return (
    <>
      <CheckboxRow
        id="meal-none"
        label={noneLabel}
        checked={hasNone}
        onCheckedChange={(isChecked) => setHasNone(isChecked === true)}
      />
      {options.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("own.multiple")}</p>
          {options.map((option) => (
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
    </>
  )
}
