import { Trash2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { PublicTerm } from "@/features/application-form/api/publicEvent"
import { termDates } from "@/features/application-form/components/TermsList"
import {
  GENDERS,
  type ApplicationFormDraft,
} from "@/features/application-form/lib/application-form-schema"

type ParticipantFieldsProps = {
  /** Position in the form, 0-based. */
  index: number
  terms: PublicTerm[]
  /** Undefined for the only participant — the last one can't be removed. */
  onRemove?: () => void
  isDisabled?: boolean
  /** Latest date of birth the date picker offers (`yyyy-MM-dd`). */
  maxBirthDate: string
}

/** One participant: own personal data and own choice of terms. */
export function ParticipantFields({
  index,
  terms,
  onRemove,
  isDisabled,
  maxBirthDate,
}: ParticipantFieldsProps) {
  const { t } = useTranslation("applicationForm")
  const { control } = useFormContext<ApplicationFormDraft>()
  const number = index + 1

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{t("form.participantTitle", { number })}</h3>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              aria-label={t("form.removeParticipantAria", { number })}
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
              {t("form.removeParticipant")}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name={`participants.${index}.firstName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.firstName")}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`participants.${index}.lastName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.lastName")}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name={`participants.${index}.birthDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.birthDate")}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  max={maxBirthDate}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`participants.${index}.gender`}
          render={({ field, fieldState }) => (
            <FormItem>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm leading-none font-medium">
                  {t("form.gender")}
                </legend>
                <RadioGroup
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  className="flex gap-6"
                >
                  {GENDERS.map((gender) => {
                    const id = `participant-${index}-gender-${gender}`
                    return (
                      <div
                        key={gender}
                        className="flex items-center gap-2"
                      >
                        <RadioGroupItem
                          id={id}
                          value={gender}
                        />
                        <Label htmlFor={id}>
                          {gender === "FEMALE" ? t("form.genderFemale") : t("form.genderMale")}
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`participants.${index}.termIds`}
          render={({ field }) => (
            <FormItem>
              <fieldset className="grid gap-3">
                <legend className="mb-3 text-sm leading-none font-medium">{t("form.terms")}</legend>
                {terms.map((term) => {
                  const id = `participant-${index}-term-${term.id}`
                  const selected = field.value ?? []
                  return (
                    <div
                      key={term.id}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={id}
                        className="mt-0.5"
                        checked={selected.includes(term.id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...selected, term.id]
                              : selected.filter((v) => v !== term.id),
                          )
                        }
                        onBlur={field.onBlur}
                      />
                      <Label
                        htmlFor={id}
                        className="flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 leading-normal"
                      >
                        <span className="flex flex-col gap-1">
                          <span>{term.name}</span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {termDates(term)}
                          </span>
                        </span>
                        <MoneyAmount
                          amountCzk={term.priceCzk}
                          className="font-normal"
                        />
                      </Label>
                    </div>
                  )
                })}
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
