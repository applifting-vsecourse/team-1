import { X } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateRange } from "@/lib/date"
import { cn } from "@/lib/utils"

import type { PublicTerm } from "@/features/application-form/api/publicEvent"
import {
  GENDERS,
  type ApplicationFormDraft,
} from "@/features/application-form/lib/application-form-schema"

// Figma (Design system): "DS / Registration participant"
// V07a https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-2708
// M02a https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-18899
// M03  https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-19517 (errors)

type ParticipantFieldsProps = {
  /** Position in the form, 0-based. */
  index: number
  terms: PublicTerm[]
  /** Only the second and later participants can be removed. */
  onRemove?: () => void
  isDisabled?: boolean
}

/** One participant: own personal data and own choice of terms. */
export function ParticipantFields({ index, terms, onRemove, isDisabled }: ParticipantFieldsProps) {
  const { t } = useTranslation("applicationForm")
  const { control } = useFormContext<ApplicationFormDraft>()
  const [firstName, lastName] = useWatch({
    control,
    name: [`participants.${index}.firstName`, `participants.${index}.lastName`],
  })
  const number = index + 1
  const name = [firstName, lastName].filter(Boolean).join(" ").trim()

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">
          {name
            ? t("form.participantTitleNamed", { number, name })
            : t("form.participantTitle", { number })}
        </h3>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            disabled={isDisabled}
            aria-label={t("form.removeParticipantAria", { number })}
            onClick={onRemove}
          >
            <X className="size-5" />
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
        <FormField
          control={control}
          name={`participants.${index}.birthDate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.birthDate")}</FormLabel>
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
          name={`participants.${index}.gender`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.gender")}</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger
                    className="w-full"
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t("form.genderPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem
                      key={gender}
                      value={gender}
                    >
                      {gender === "FEMALE" ? t("form.genderFemale") : t("form.genderMale")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name={`participants.${index}.termIds`}
        render={({ field, fieldState }) => (
          <FormItem>
            {/* Tiles: "DS / Term option" https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13196-776 */}
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm leading-5 font-medium">{t("form.terms")}</legend>
              {terms.map((term) => {
                const id = `participant-${index}-term-${term.id}`
                const selected = field.value ?? []
                return (
                  <Label
                    key={term.id}
                    htmlFor={id}
                    className={cn(
                      "min-h-14 cursor-pointer gap-3 rounded-md border border-input bg-card px-4 py-3 text-base leading-6 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-primary",
                      fieldState.invalid && "border-destructive",
                    )}
                  >
                    <Checkbox
                      id={id}
                      className="size-5"
                      checked={selected.includes(term.id)}
                      onCheckedChange={(isChecked) =>
                        field.onChange(
                          isChecked
                            ? [...selected, term.id]
                            : selected.filter((v) => v !== term.id),
                        )
                      }
                      onBlur={field.onBlur}
                    />
                    <span className="flex-1 font-semibold">
                      {formatDateRange(term.startsOn, term.endsOn)}
                    </span>
                    <span className="sr-only"> · </span>
                    <MoneyAmount
                      className="font-bold"
                      amountCzk={term.priceCzk}
                    />
                  </Label>
                )
              })}
            </fieldset>
            <FormMessage />
          </FormItem>
        )}
      />
    </Card>
  )
}
